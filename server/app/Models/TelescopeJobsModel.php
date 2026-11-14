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
        'id', 'source', 'user_id', 'target_name', 'object', 'ra', 'dec', 'mode', 'preset', 'plan', 'min_altitude',
        'min_moon_separation', 'valid_until', 'priority', 'pinned', 'held', 'status', 'status_reason',
        'cancel_requested_at', 'version', 'progress', 'last_seq', 'reviewed_by', 'reviewed_at',
        'accepted_at', 'started_at', 'first_frame_at', 'last_frame_at', 'finished_at',
        'night', 'visits_done', 'visits_planned',
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
            // ranks jobs (pinned, the admin priority, the oldest first), held ones after it, the
            // ones waiting for approval after those, the finished last (the latest first). The night's own score
            // (altitude, Moon) is the agent's: the real order of a night may differ within a rank
            $builder->orderBy(self::QUEUE_RANK, 'ASC', false)
                // The finished ones (the last rank): the latest first
                ->orderBy("CASE WHEN j.status IN ('" . implode("', '", Telescope::FINAL_STATUSES) . "') THEN COALESCE(j.finished_at, j.updated_at) END", 'DESC', false)
                // The patrol only takes the time the visitors' jobs leave (spec §4.10)
                ->orderBy("CASE WHEN j.source = '" . Telescope::SOURCE_PATROL . "' THEN 1 ELSE 0 END", 'ASC', false)
                ->orderBy('j.pinned', 'DESC')
                ->orderBy('j.priority', 'DESC')
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
            'source'            => $row['source'] ?? Telescope::SOURCE_SITE,
            'targetName'        => $row['target_name'],
            'object'            => $row['object'],
            'ra'                => $row['ra'] === null ? null : (float) $row['ra'],
            'dec'               => $row['dec'] === null ? null : (float) $row['dec'],
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
            // A patrol night (`source` = patrol): its date, the visits so far and the targets planned
            'patrol'            => ($row['source'] ?? null) === Telescope::SOURCE_PATROL ? [
                'night'         => $row['night'],
                'visitsDone'    => (int) $row['visits_done'],
                'visitsPlanned' => (int) $row['visits_planned'],
            ] : null,
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
        ];

        if ($manager) {
            $job['version']            = (int) $row['version'];
            $job['reviewedBy']         = $row['reviewed_by'];
        }

        return $job;
    }
}
