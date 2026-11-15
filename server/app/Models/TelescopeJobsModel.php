<?php

namespace App\Models;

use CodeIgniter\I18n\Time;
use Config\Telescope;

/**
 * TelescopeJobsModel
 *
 * Jobs users ask the observatory to shoot (FEAT-30 phase 2, `features/observatory-agent.md` §4).
 * Every status change is a conditional UPDATE (`WHERE status IN (...)`), so an author's cancel, an
 * admin's review and the agent's update can never overwrite each other: whoever changes the row
 * first wins and the other gets `false`. Every change of a portal-owned field bumps `version`
 * (what the agent compares), and an admin edit is accepted only for the version the admin saw.
 */
class TelescopeJobsModel extends ApplicationBaseModel
{
    protected $table            = 'telescope_jobs';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'id', 'user_id', 'target_name', 'object', 'ra', 'dec', 'mode', 'preset', 'plan', 'min_altitude',
        'min_moon_separation', 'valid_until', 'priority', 'pinned', 'held', 'status', 'status_reason',
        'cancel_requested_at', 'version', 'progress', 'last_seq', 'reviewed_by', 'reviewed_at',
        'accepted_at', 'started_at', 'first_frame_at', 'last_frame_at', 'finished_at', 'repeated_at',
    ];

    /** What a repeat resets (and what restore() puts back) besides the status and the review */
    private const REPEAT_FIELDS = [
        'progress', 'first_frame_at', 'last_frame_at', 'accepted_at', 'started_at', 'finished_at',
        'status_reason', 'cancel_requested_at', 'held', 'repeated_at', 'valid_until', 'reviewed_by', 'reviewed_at',
    ];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];

    /** Fields an admin may change while the job is not final; they never touch the plan */
    public const SCHEDULING_FIELDS = ['priority', 'pinned', 'held'];

    /** Fields of the target/plan/constraints — not while the observatory is shooting the job */
    public const PLAN_FIELDS = ['target_name', 'object', 'ra', 'dec', 'mode', 'preset', 'plan', 'min_altitude', 'min_moon_separation', 'valid_until'];

    private static function now(): string
    {
        return Time::now('UTC')->toDateTimeString();
    }

    public function countActive(string $userId): int
    {
        return $this->where('user_id', $userId)->whereIn('status', Telescope::ACTIVE_STATUSES)->countAllResults();
    }

    /**
     * @param array $data validated plan fields (TelescopeJobValidator::validate())
     *
     * @return string the new job id
     */
    public function createJob(array $data, string $userId, bool $approved): string
    {
        $now = self::now();
        $row = $data + [
            'user_id' => $userId,
            'status'  => $approved ? Telescope::STATUS_APPROVED : Telescope::STATUS_PENDING,
            'version' => 1,
        ];

        if ($approved) {
            $row['reviewed_by'] = $userId;
            $row['reviewed_at'] = $now;
        }

        $this->insert($row);

        return $this->getInsertID();
    }

    /**
     * The author (or an admin) cancels a job.
     *
     * @return string|null `cancelled` — done at once (still waiting for approval: the observatory
     *                     never got it); `cancel_requested` — the agent removes it at a safe point
     *                     and confirms (an approved job too: the agent pulls it at once and may
     *                     have loaded it into Ekos before its "accepted" reached the site);
     *                     null — the job is final already
     */
    public function cancel(string $id): ?string
    {
        $now = self::now();

        // Not given to the observatory yet: final at once
        $this->builder()
            ->where('id', $id)
            ->where('status', Telescope::STATUS_PENDING)
            ->set('status', Telescope::STATUS_CANCELLED)
            ->set('finished_at', $now)
            ->set('updated_at', $now)
            ->set('version', 'version + 1', false)
            ->update();

        if ($this->db->affectedRows() === 1) {
            return Telescope::STATUS_CANCELLED;
        }

        $this->builder()
            ->where('id', $id)
            ->whereIn('status', Telescope::AGENT_STATUSES)
            ->where('cancel_requested_at', null)
            ->set('cancel_requested_at', $now)
            ->set('updated_at', $now)
            ->set('version', 'version + 1', false)
            ->update();

        if ($this->db->affectedRows() === 1) {
            return 'cancel_requested';
        }

        // Asked twice: still waiting for the agent
        $row = $this->find($id);

        if ($row && in_array($row['status'], Telescope::AGENT_STATUSES, true) && $row['cancel_requested_at'] !== null) {
            return 'cancel_requested';
        }

        return null;
    }

    /**
     * Approves or rejects a pending job.
     *
     * @return bool false when the job is not pending (any more)
     */
    public function review(string $id, bool $approve, string $reviewerId, ?string $reason = null): bool
    {
        $now     = self::now();
        $builder = $this->builder()
            ->where('id', $id)
            ->where('status', Telescope::STATUS_PENDING)
            ->set('status', $approve ? Telescope::STATUS_APPROVED : Telescope::STATUS_REJECTED)
            ->set('status_reason', $approve ? null : $reason)
            ->set('reviewed_by', $reviewerId)
            ->set('reviewed_at', $now)
            ->set('updated_at', $now)
            ->set('version', 'version + 1', false);

        if (!$approve) {
            $builder->set('finished_at', $now);
        }

        $builder->update();

        return $this->db->affectedRows() === 1;
    }

    /**
     * An admin's edit of the portal-owned fields, accepted only for the version they saw.
     *
     * @param array $fields table values: SCHEDULING_FIELDS and/or PLAN_FIELDS
     *
     * @return string|null null on success, otherwise the reason: `not_found`, `changed`
     *                     (another version), `final`, `running` (plan fields of a job the
     *                     observatory is shooting or cancelling), `not_pausable` (a pause —
     *                     `held` on — of a job that is not approved/queued: one being shot
     *                     would go on to the end of the night, a pending one is reviewed instead)
     */
    public function edit(string $id, int $version, array $fields): ?string
    {
        $fields = array_intersect_key($fields, array_flip([...self::SCHEDULING_FIELDS, ...self::PLAN_FIELDS]));
        $row    = $this->find($id);

        if (!$row) {
            return 'not_found';
        }

        if ((int) $row['version'] !== $version) {
            return 'changed';
        }

        if (in_array($row['status'], Telescope::FINAL_STATUSES, true)) {
            return 'final';
        }

        $touchesPlan = (bool) array_intersect_key($fields, array_flip(self::PLAN_FIELDS));
        $planStatuses = [Telescope::STATUS_PENDING, Telescope::STATUS_APPROVED, Telescope::STATUS_QUEUED];

        if ($touchesPlan && (!in_array($row['status'], $planStatuses, true) || $row['cancel_requested_at'] !== null)) {
            return 'running';
        }

        $pausing         = (int) ($fields['held'] ?? 0) === 1 && !(int) $row['held'];
        $pausableStatuses = [Telescope::STATUS_APPROVED, Telescope::STATUS_QUEUED];

        if ($pausing && (!in_array($row['status'], $pausableStatuses, true) || $row['cancel_requested_at'] !== null)) {
            return 'not_pausable';
        }

        if (!$fields) {
            return null;
        }

        $now     = self::now();
        $builder = $this->builder()
            ->where('id', $id)
            ->where('version', $version)
            ->whereIn('status', $pausing ? $pausableStatuses : ($touchesPlan ? $planStatuses : Telescope::ACTIVE_STATUSES));

        if ($touchesPlan) {
            $builder->where('cancel_requested_at', null);
        }

        foreach ($fields as $field => $value) {
            $builder->set($field, $value);
        }

        $builder->set('updated_at', $now)->set('version', 'version + 1', false)->update();

        // Lost a race (the agent started it, the author cancelled it, another admin saved first)
        return $this->db->affectedRows() === 1 ? null : 'changed';
    }

    /**
     * Puts a finished job back into the queue to be shot again from scratch — the same job, so
     * its id, plan, priority, pin, `last_seq` and the update log stay. One conditional UPDATE on
     * the repeatable statuses: a second repeat (or a race) finds nothing to change.
     *
     * @param string|null $approvedBy a manager's id: approved at once; null — an author's repeat,
     *                                waiting for approval again (`pending`)
     *
     * @return array|null the row as it was (for restore()), or null when it isn't repeatable (any more)
     */
    public function repeat(string $id, ?string $approvedBy): ?array
    {
        $previous = $this->find($id);

        if (!$previous || !in_array($previous['status'], Telescope::REPEATABLE_STATUSES, true)) {
            return null;
        }

        $now = self::now();

        $this->builder()
            ->where('id', $id)
            ->where('status', $previous['status'])
            ->where('version', $previous['version'])
            ->set([
                'status'              => $approvedBy !== null ? Telescope::STATUS_APPROVED : Telescope::STATUS_PENDING,
                'progress'            => '{}',
                'first_frame_at'      => null,
                'last_frame_at'       => null,
                'accepted_at'         => null,
                'started_at'          => null,
                'finished_at'         => null,
                'status_reason'       => null,
                'cancel_requested_at' => null,
                'held'                => 0,
                'repeated_at'         => $now,
                'reviewed_by'         => $approvedBy,
                'reviewed_at'         => $approvedBy !== null ? $now : null,
                'updated_at'          => $now,
            ])
            // A date already passed would expire the job at once
            ->set('valid_until', $previous['valid_until'] !== null && $previous['valid_until'] < ObservatoryNightPlansModel::currentNight() ? null : $previous['valid_until'])
            ->set('version', 'version + 1', false)
            ->update();

        return $this->db->affectedRows() === 1 ? $previous : null;
    }

    /**
     * Takes a repeat back (the author's active-jobs limit got crossed by a parallel request): the
     * job as it was before repeat(), with a new `version` — the agent may have seen the repeat.
     */
    public function restore(string $id, array $previous): void
    {
        $fields = array_intersect_key($previous, array_flip([...self::REPEAT_FIELDS, 'status']));

        $this->builder()
            ->where('id', $id)
            ->where('status', Telescope::STATUS_PENDING)
            ->set($fields + ['updated_at' => self::now()])
            ->set('version', 'version + 1', false)
            ->update();
    }

    /**
     * Deletes a job outright (`telescope.manage`): only one the observatory doesn't have
     * (pending) or a final one. An approved, queued or running job must be cancelled first, or
     * the observatory could keep shooting a job the site no longer knows (an approved one may
     * already be in its schedule). The update log goes with it (FK cascade).
     *
     * @return bool false when the job is (now) on the observatory or gone
     */
    public function remove(string $id): bool
    {
        $this->builder()
            ->where('id', $id)
            ->whereIn('status', [Telescope::STATUS_PENDING, ...Telescope::FINAL_STATUSES])
            ->delete();

        if ($this->db->affectedRows() !== 1) {
            return false;
        }

        // SQLite (tests) enforces the FK only with the pragma on; MariaDB cascades anyway
        $this->db->table('telescope_job_updates')->where('job_id', $id)->delete();

        return true;
    }

    /**
     * Jobs with the author's public name and avatar, newest first — or in the queue's order.
     *
     * @param array{userId?: string, status?: list<string>, sort?: 'queue'} $filter
     */
    public function listJobs(array $filter = [], int $limit = 100, int $offset = 0): array
    {
        $builder = $this->filtered($filter)
            ->select('j.*, u.name AS author_name, u.avatar AS author_avatar')
            ->join('users u', 'u.id = j.user_id', 'left');

        if (($filter['sort'] ?? null) === 'queue') {
            // What the observatory shoots next: the running job, then the queue the way the agent
            // ranks jobs (pinned, the admin priority, a repeated job before the others — the
            // latest repeat first —, the oldest first), held ones after it, the
            // ones waiting for approval after those, the finished last (the latest first). The night's own score
            // (altitude, Moon) is the agent's: the real order of a night may differ within a rank
            $builder->orderBy(self::QUEUE_RANK, 'ASC', false)
                // The finished ones (the last rank): the latest first
                ->orderBy("CASE WHEN j.status IN ('" . implode("', '", Telescope::FINAL_STATUSES) . "') THEN COALESCE(j.finished_at, j.updated_at) END", 'DESC', false)
                ->orderBy('j.pinned', 'DESC')
                ->orderBy('j.priority', 'DESC')
                // Repeated: back at the top of its pinned/priority group
                ->orderBy('CASE WHEN j.repeated_at IS NULL THEN 1 ELSE 0 END', 'ASC', false)
                ->orderBy('j.repeated_at', 'DESC')
                ->orderBy('j.created_at', 'ASC');
        } else {
            $builder->orderBy('j.created_at', 'DESC');
        }

        return $builder->orderBy('j.id', 'DESC')->limit($limit, $offset)->get()->getResultArray();
    }

    /** The queue position group of a job (see listJobs(), `sort` = queue) */
    private const QUEUE_RANK = "CASE WHEN j.status = 'running' THEN 0"
        . " WHEN j.status IN ('queued', 'approved') AND j.held = 0 THEN 1"
        . " WHEN j.status IN ('queued', 'approved') THEN 2"
        . " WHEN j.status = 'pending' THEN 3 ELSE 4 END";

    /**
     * @param array{userId?: string, status?: list<string>} $filter the same as listJobs()
     */
    public function countJobs(array $filter = []): int
    {
        return $this->filtered($filter)->countAllResults();
    }

    /**
     * The jobs table (`j`) narrowed by a filter of listJobs()/countJobs() — one place, so the
     * pager's count always matches the items.
     *
     * @param array{userId?: string, status?: list<string>} $filter
     */
    private function filtered(array $filter): \CodeIgniter\Database\BaseBuilder
    {
        $builder = $this->db->table($this->table . ' j');

        if (isset($filter['userId'])) {
            $builder->where('j.user_id', $filter['userId']);
        }

        if (!empty($filter['status'])) {
            $builder->whereIn('j.status', $filter['status']);
        }

        return $builder;
    }

    public function findWithAuthor(string $id): ?array
    {
        return $this->db->table($this->table . ' j')
            ->select('j.*, u.name AS author_name, u.avatar AS author_avatar')
            ->join('users u', 'u.id = j.user_id', 'left')
            ->where('j.id', $id)
            ->get()
            ->getRowArray() ?: null;
    }

    /**
     * The API shape of a job row (from listJobs()/findWithAuthor()).
     *
     * @param bool        $manager  adds what only `telescope.manage` sees: the version and the
     *                               reviewer
     * @param string|null $viewerId the signed-in viewer: `own` marks their jobs; the status
     *                              reason (why it was rejected/failed) is only for the author
     *                              and managers
     */
    public static function format(array $row, bool $manager = false, ?string $viewerId = null): array
    {
        $own = $viewerId !== null && $row['user_id'] !== null && $row['user_id'] === $viewerId;
        $date = static fn (?string $value) => $value ? Time::parse($value, 'UTC')->format('Y-m-d\TH:i:s\Z') : null;

        $progress = json_decode((string) ($row['progress'] ?? ''), true);
        $job      = [
            'id'                => $row['id'],
            'targetName'        => $row['target_name'],
            'object'            => $row['object'],
            'ra'                => (float) $row['ra'],
            'dec'               => (float) $row['dec'],
            'mode'              => $row['mode'],
            'preset'            => $row['preset'],
            'plan'              => json_decode($row['plan'], true) ?: [],
            'minAltitude'       => (float) $row['min_altitude'],
            'minMoonSeparation' => $row['min_moon_separation'] === null ? null : (int) $row['min_moon_separation'],
            'validUntil'        => $row['valid_until'],
            'priority'          => (int) $row['priority'],
            'pinned'            => (bool) $row['pinned'],
            'held'              => (bool) $row['held'],
            'status'            => $row['status'],
            'statusReason'      => $own || $manager ? $row['status_reason'] : null,
            // A cancel asked for while the agent finished the job is moot once the job is final
            'cancelRequested'   => $row['cancel_requested_at'] !== null && !in_array($row['status'], Telescope::FINAL_STATUSES, true),
            'own'               => $own,
            'progress'          => is_array($progress) ? $progress : (object) [],
            // The author's name in full (a job is a public credit, unlike a comment — decision of
            // 2026-11-06); the id builds the avatar's URL (users/<id>/<avatar>), as comments do
            'author'            => $row['user_id'] === null ? null : [
                'id'     => $row['user_id'],
                'name'   => (string) ($row['author_name'] ?? ''),
                'avatar' => $row['author_avatar'] ?? null,
            ],
            'createdAt'         => $date($row['created_at']),
            'reviewedAt'        => $date($row['reviewed_at']),
            'acceptedAt'        => $date($row['accepted_at']),
            'startedAt'         => $date($row['started_at']),
            'firstFrameAt'      => $date($row['first_frame_at']),
            'lastFrameAt'       => $date($row['last_frame_at']),
            'finishedAt'        => $date($row['finished_at']),
            'repeatedAt'        => $date($row['repeated_at'] ?? null),
        ];

        if ($manager) {
            $job['version']            = (int) $row['version'];
            $job['reviewedBy']         = $row['reviewed_by'];
        }

        return $job;
    }
}
