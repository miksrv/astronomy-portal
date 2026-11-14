<?php

namespace App\Controllers;

use App\Enums\Permission;
use App\Libraries\LocaleLibrary;
use App\Libraries\PatrolNights;
use App\Libraries\SessionLibrary;
use App\Libraries\TelescopeAgentSync;
use App\Libraries\TelescopeJobValidator;
use App\Libraries\TelescopeMailer;
use App\Libraries\TelescopeSettings;
use App\Models\ObservatoryNightPlansModel;
use App\Models\TelescopeJobsModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;
use Config\Telescope as TelescopeConfig;
use Throwable;

/**
 * Telescope jobs on the site (FEAT-30 phase 2, `features/observatory-agent.md` §4). Everyone sees
 * the jobs (`/observatory/jobs`) except rejected and cancelled ones, and tonight's plan; any
 * authenticated user creates and cancels their own jobs within the limits; a `telescope.manage`
 * holder sees every job, approves/rejects, prioritises, edits and deletes them, and their own
 * jobs are approved at once (decisions #16, #17). The observatory side of a job (the agent's pull
 * and its updates) is in `ObservatoryAgent`.
 */
class Telescope extends BaseApiController
{
    private SessionLibrary $session;

    public function __construct()
    {
        LocaleLibrary::init();

        $this->session = new SessionLibrary();
    }

    /** Largest page of the jobs list */
    private const MAX_LIMIT = 100;

    /** The site's own upkeep of the job statuses runs at most this often, seconds */
    private const UPKEEP_SECONDS = 60;

    /**
     * Statuses that change with the date, kept right without the observatory: overdue jobs
     * expire (their authors are e-mailed) and patrol nights whose dawn passed are completed. The
     * agent's pull does the same, but the agent may be off for weeks — and a stale active job
     * would still count against its author's limit. At most once a minute: the reads stay cheap.
     */
    private function upkeep(): void
    {
        try {
            $cache = service('cache');

            if ($cache->get('telescope_upkeep')) {
                return;
            }

            $cache->save('telescope_upkeep', 1, self::UPKEEP_SECONDS);

            $mailer = new TelescopeMailer();

            foreach ((new TelescopeAgentSync())->expireOverdue() as $job) {
                $mailer->expired($job);
            }

            (new PatrolNights())->closeFinished();
        } catch (Throwable $e) {
            // Never fails a read: the agent's next pull does the same
            log_message('error', '{exception}', ['exception' => $e]);
        }
    }

    private function isManager(): bool
    {
        return $this->session->isAuth && $this->session->can(Permission::TELESCOPE_MANAGE);
    }

    private function viewerId(): ?string
    {
        return $this->session->isAuth ? $this->session->user->id : null;
    }

    private function formatJob(array $row): array
    {
        return TelescopeJobsModel::format($row, $this->isManager(), $this->viewerId());
    }

    /** Everyone may see a job in a public status; the author and managers see theirs in any */
    private function canSee(array $row): bool
    {
        return in_array($row['status'], TelescopeConfig::PUBLIC_STATUSES, true)
            || ($row['user_id'] !== null && $row['user_id'] === $this->viewerId())
            || $this->isManager();
    }

    /**
     * `GET /telescope/config` — what the job form needs: filters, presets, limits, and for a
     * signed-in user the number of their active jobs.
     */
    public function config(): ResponseInterface
    {
        try {
            $settings = TelescopeSettings::load();
            $config   = $settings->forForm() + ['presets' => TelescopeJobValidator::presets($settings)];

            if ($this->session->isAuth) {
                $this->upkeep();
                $config['activeJobs'] = (new TelescopeJobsModel())->countActive($this->session->user->id);
                $config['unlimited']  = $this->isManager();
            }

            return $this->respond($config);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * `GET /telescope/jobs` — public: every job except rejected and cancelled ones.
     * `?mine=1` (signed in): the caller's own jobs in any status. `?all=1` (`telescope.manage`):
     * every job in any status. Optional `&status=a,b`, `&limit=` (≤ 100, default 50), `&offset=`.
     */
    public function list(): ResponseInterface
    {
        $mine = $this->request->getGet('mine') === '1';
        $all  = $this->request->getGet('all') === '1';

        if (($mine || $all) && !$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if ($all && !$this->isManager()) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        $allowed = $mine || $all ? [...TelescopeConfig::ACTIVE_STATUSES, ...TelescopeConfig::FINAL_STATUSES] : TelescopeConfig::PUBLIC_STATUSES;
        $filter  = ['status' => $allowed];

        if ($mine) {
            $filter['userId'] = $this->session->user->id;
        }

        if ($this->request->getGet('sort') === 'queue') {
            $filter['sort'] = 'queue';
        }

        $status = $this->request->getGet('status');

        if (is_string($status) && $status !== '') {
            $statuses = array_values(array_intersect(explode(',', $status), $allowed));

            if (!$statuses) {
                return $this->respondInvalidRequest('telescope jobs: unknown status filter');
            }

            $filter['status'] = $statuses;
        }

        $limit  = min(self::MAX_LIMIT, max(1, (int) ($this->request->getGet('limit') ?? 50)));
        $offset = max(0, (int) ($this->request->getGet('offset') ?? 0));

        try {
            $this->upkeep();

            $model = new TelescopeJobsModel();
            $rows  = $model->listJobs($filter, $limit, $offset);

            return $this->respond([
                'items' => array_map(fn (array $row) => $this->formatJob($row), $rows),
                'count' => $model->countJobs($filter),
            ]);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * `GET /telescope/jobs/:id` — public for a job in a public status; a rejected or cancelled
     * one only for its author and managers (anyone else gets 404).
     */
    public function show($id = null): ResponseInterface
    {
        try {
            $this->upkeep();

            $row = $id ? (new TelescopeJobsModel())->findWithAuthor($id) : null;

            // A job one may not see is "not found", not "forbidden": ids are not to be probed
            if (!$row || !$this->canSee($row)) {
                return $this->respondNotFound(lang('Telescope.jobNotFound'));
            }

            $job = $this->formatJob($row);

            // A patrol night: the galaxies it visited, in the order they were shot
            if ($row['source'] === TelescopeConfig::SOURCE_PATROL) {
                $job['visits'] = (new PatrolNights())->visitsOf($row['id']);
            }

            return $this->respond($job);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * `GET /telescope/tonight` — public: tonight's plan as the observatory agent built it (the
     * planned jobs with their authors, the patrol targets, darkness, the Moon). A
     * `telescope.manage` holder also gets the agent's full report (`report`: scores, reasons,
     * warnings, the Ekos state). `plan` is null while the agent hasn't planned the night.
     */
    public function tonight(): ResponseInterface
    {
        try {
            $model = new ObservatoryNightPlansModel();
            $night = ObservatoryNightPlansModel::currentNight();
            $plan  = $model->plan($night);

            $answer = [
                'night'          => $night,
                'autonomousMode' => TelescopeSettings::load()->autonomousMode,
                'plan'           => $plan ? $model->publicView($night, $plan) : null,
            ];

            if ($plan && $this->isManager()) {
                unset($plan['_updatedAt']);
                $answer['report'] = $plan;
            }

            return $this->respond($answer);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * `POST /telescope/jobs` — a new job. Body: targetName, object?, ra, dec (J2000, degrees),
     * mode (simple|pro), preset (simple) or plan [{filter, exposure, count}] (pro), minAltitude?,
     * minMoonSeparation?, validUntil? (Y-m-d).
     */
    public function create(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        $input = $this->request->getJSON(true);

        if (!is_array($input)) {
            return $this->respondInvalidRequest('telescope jobs: body is not a JSON object');
        }

        try {
            $settings  = TelescopeSettings::load();
            $manager   = $this->isManager();
            $validator = new TelescopeJobValidator($settings, $manager);
            $data      = $validator->validate($input);

            if ($data === null) {
                return $this->respondValidationErrors($validator->errors());
            }

            // An overdue job of the author's must not count against the limit
            $this->upkeep();

            $model  = new TelescopeJobsModel();
            $userId = $this->session->user->id;

            if (!$manager && $model->countActive($userId) >= $settings->maxActiveJobs) {
                return $this->respondConflict(lang('Telescope.tooManyActive', [$settings->maxActiveJobs]));
            }

            $data['object'] = $this->existingObject($data['object']);

            $id = $model->createJob($data, $userId, $manager);

            // Parallel requests all pass the check above: count again after the insert and take
            // this job back if the limit got crossed (when two race, both step back — fail-safe)
            if (!$manager && $model->countActive($userId) > $settings->maxActiveJobs) {
                $model->delete($id);

                return $this->respondConflict(lang('Telescope.tooManyActive', [$settings->maxActiveJobs]));
            }

            return $this->respondCreated([
                'message' => lang($manager ? 'Telescope.jobCreatedApproved' : 'Telescope.jobCreated'),
                'job'     => $this->formatJob($model->findWithAuthor($id)),
            ]);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * `DELETE /telescope/jobs/:id` — the author (or a manager) cancels the job. A job the
     * observatory already has is only marked; the agent takes it off the schedule at a safe point.
     */
    public function cancel(?string $id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        try {
            $model = new TelescopeJobsModel();
            $row   = $id ? $model->find($id) : null;

            if (!$row || ($row['user_id'] !== $this->session->user->id && !$this->isManager())) {
                return $this->respondNotFound(lang('Telescope.jobNotFound'));
            }

            if ($row['source'] !== TelescopeConfig::SOURCE_SITE) {
                return $this->respondConflict(lang('Telescope.patrolNotEditable'));
            }

            $result = $model->cancel($id);

            if ($result === null) {
                return $this->respondConflict(lang('Telescope.jobNotCancellable'));
            }

            return $this->respond([
                'message' => lang($result === TelescopeConfig::STATUS_CANCELLED ? 'Telescope.jobCancelled' : 'Telescope.jobCancelRequested'),
                'job'     => $this->formatJob($model->findWithAuthor($id)),
            ]);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * `POST /telescope/jobs/:id/remove` (`telescope.manage`) — deletes the job outright: only a
     * job the observatory doesn't have yet (pending, approved) or a final one; a queued or
     * running job is cancelled first (409 otherwise).
     */
    public function remove(?string $id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->isManager()) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        try {
            $model = new TelescopeJobsModel();

            $row = $id ? $model->find($id) : null;

            if (!$row) {
                return $this->respondNotFound(lang('Telescope.jobNotFound'));
            }

            // A patrol night is the record of its visits (they would make it again)
            if ($row['source'] !== TelescopeConfig::SOURCE_SITE) {
                return $this->respondConflict(lang('Telescope.patrolNotEditable'));
            }

            if (!$model->remove($id)) {
                return $this->respondConflict(lang('Telescope.jobNotRemovable'));
            }

            return $this->respond(['message' => lang('Telescope.jobRemoved')]);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * `POST /telescope/jobs/:id/approve` (`telescope.manage`)
     */
    public function approve(?string $id = null): ResponseInterface
    {
        return $this->review($id, true);
    }

    /**
     * `POST /telescope/jobs/:id/reject` (`telescope.manage`) — body: reason (shown to the author).
     */
    public function reject(?string $id = null): ResponseInterface
    {
        return $this->review($id, false);
    }

    private function review(?string $id, bool $approve): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->isManager()) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        $reason = null;

        if (!$approve) {
            $input  = $this->request->getJSON(true);
            $reason = is_array($input) && is_string($input['reason'] ?? null) ? trim($input['reason']) : '';

            if ($reason === '' || mb_strlen($reason) > TelescopeConfig::MAX_REASON) {
                return $this->respondValidationErrors(['reason' => lang('Telescope.reasonInvalid', [TelescopeConfig::MAX_REASON])]);
            }
        }

        try {
            $model = new TelescopeJobsModel();

            $row = $id ? $model->find($id) : null;

            if (!$row) {
                return $this->respondNotFound(lang('Telescope.jobNotFound'));
            }

            if ($row['source'] !== TelescopeConfig::SOURCE_SITE) {
                return $this->respondConflict(lang('Telescope.patrolNotEditable'));
            }

            if (!$model->review($id, $approve, $this->session->user->id, $reason)) {
                return $this->respondConflict(lang('Telescope.jobNotPending'));
            }

            $row    = $model->findWithAuthor($id);
            $mailer = new TelescopeMailer();
            $approve ? $mailer->approved($row) : $mailer->rejected($row, $reason);

            return $this->respond($this->formatJob($row));
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * `PATCH /telescope/jobs/:id` (`telescope.manage`) — body: `version` (the one the admin saw,
     * 409 if the job changed since) and any of priority, pinned, held, and the plan fields of
     * create(). The plan fields can't change while the observatory is shooting the job.
     */
    public function update($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->isManager()) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        $input = $this->request->getJSON(true);

        if (!is_array($input) || !is_int($input['version'] ?? null)) {
            return $this->respondInvalidRequest('telescope jobs: PATCH without an integer version');
        }

        try {
            $model = new TelescopeJobsModel();
            $row   = $id ? $model->find($id) : null;

            if (!$row) {
                return $this->respondNotFound(lang('Telescope.jobNotFound'));
            }

            if ($row['source'] !== TelescopeConfig::SOURCE_SITE) {
                return $this->respondConflict(lang('Telescope.patrolNotEditable'));
            }

            $fields = [];
            $errors = [];

            if (array_key_exists('priority', $input)) {
                if (!is_int($input['priority']) || abs($input['priority']) > 1000) {
                    $errors['priority'] = lang('App.invalidRequest');
                } else {
                    $fields['priority'] = $input['priority'];
                }
            }

            foreach (['pinned', 'held'] as $flag) {
                if (array_key_exists($flag, $input)) {
                    if (!is_bool($input[$flag])) {
                        $errors[$flag] = lang('App.invalidRequest');
                    } else {
                        $fields[$flag] = $input[$flag] ? 1 : 0;
                    }
                }
            }

            $planKeys = ['targetName', 'object', 'ra', 'dec', 'mode', 'preset', 'plan', 'minAltitude', 'minMoonSeparation', 'validUntil'];

            if (array_intersect_key($input, array_flip($planKeys))) {
                $current = [
                    'targetName'        => $row['target_name'],
                    'object'            => $row['object'],
                    'ra'                => $row['ra'],
                    'dec'               => $row['dec'],
                    'mode'              => $row['mode'],
                    'preset'            => $row['preset'],
                    'plan'              => json_decode($row['plan'], true),
                    'minAltitude'       => $row['min_altitude'],
                    'minMoonSeparation' => $row['min_moon_separation'],
                ];
                // The stored date is not checked again: a job whose date has passed (one being shot
                // is not expired) can still have its plan changed; a date sent with the patch is
                $validator = new TelescopeJobValidator(TelescopeSettings::load(), true);
                $data      = $validator->validate(array_merge($current, array_intersect_key($input, array_flip($planKeys))));

                if ($data === null) {
                    $errors += $validator->errors();
                } else {
                    if (!array_key_exists('validUntil', $input)) {
                        unset($data['valid_until']);
                    }

                    $data['object'] = $this->existingObject($data['object']);
                    $fields += $data;
                }
            }

            if ($errors) {
                return $this->respondValidationErrors($errors);
            }

            $result = $model->edit($id, $input['version'], $fields);

            return match ($result) {
                null        => $this->respond($this->formatJob($model->findWithAuthor($id))),
                'not_found' => $this->respondNotFound(lang('Telescope.jobNotFound')),
                'running'   => $this->respondConflict(lang('Telescope.jobRunningEdit')),
                'not_pausable' => $this->respondConflict(lang('Telescope.jobNotPausable')),
                'final'     => $this->respondConflict(lang('Telescope.jobNotEditable')),
                default     => $this->respondConflict(lang('Telescope.jobChanged')),
            };
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * Our object's catalog name if it exists (the link to the object page), otherwise null —
     * the job itself needs only the name and the coordinates.
     */
    private function existingObject(?string $name): ?string
    {
        if ($name === null) {
            return null;
        }

        $found = Database::connect()->table('objects')
            ->where('catalog_name', $name)
            ->where('deleted_at', null)
            ->countAllResults();

        return $found ? $name : null;
    }
}
