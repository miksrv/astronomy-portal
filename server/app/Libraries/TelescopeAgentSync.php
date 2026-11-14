<?php

namespace App\Libraries;

use App\Models\ObservatoryNightPlansModel;
use CodeIgniter\Database\BaseConnection;
use CodeIgniter\I18n\Time;
use Config\Database;
use Config\Telescope;

/**
 * The portal side of the job sync with the observatory agent (FEAT-30 §4.3).
 *
 * - `desiredState()` — every job the observatory should know about, after expiring the overdue.
 * - `applyUpdates()` — the agent's outbox, in order. Per job a `seq` (1, 2, 3 …): a seen one is a
 *   duplicate, the next one is applied, a gap stops the batch. A transition that doesn't fit the
 *   job's current status still consumes its `seq` (logged with `applied = 0`), so the agent's
 *   outbox never gets stuck. Progress is absolute counts, so nothing is ever counted twice.
 *
 * Every job change is a conditional UPDATE guarded by the `last_seq` and the status that were
 * read, so a concurrent cancel or edit on the site is never overwritten (the update is re-read
 * and retried).
 */
class TelescopeAgentSync
{
    public const TYPES = ['accepted', 'started', 'progress', 'night_ended', 'completed', 'failed', 'cancelled'];

    /** Updates in one batch (a night of frames is a few hundred) */
    public const MAX_BATCH = 500;

    /** Filters in a progress report, and the largest count accepted */
    private const MAX_PROGRESS_FILTERS = 20;
    private const MAX_PROGRESS_COUNT   = 100000;

    private BaseConnection $db;

    /** @var list<array{kind: string, job: array}> e-mails to send after the batch */
    private array $notifications = [];

    public function __construct(?BaseConnection $db = null)
    {
        $this->db = $db ?? Database::connect();
    }

    /**
     * Jobs past their "valid until" that the observatory isn't shooting right now become
     * `expired`. "Valid until X" includes the night that starts on the evening of X, so the date
     * is compared with the current night (local noon → noon), not with the calendar day. A running
     * job finishes its night first and expires on the next pull.
     *
     * @return list<array> the expired job rows (for the author's e-mail)
     */
    public function expireOverdue(): array
    {
        $today = ObservatoryNightPlansModel::currentNight();
        $now   = Time::now('UTC')->toDateTimeString();
        $rows  = $this->db->table('telescope_jobs')
            ->where('source', Telescope::SOURCE_SITE)
            ->whereIn('status', [Telescope::STATUS_PENDING, Telescope::STATUS_APPROVED, Telescope::STATUS_QUEUED])
            ->where('valid_until <', $today)
            ->get()
            ->getResultArray();

        $expired = [];

        foreach ($rows as $row) {
            $this->db->table('telescope_jobs')
                ->where('id', $row['id'])
                ->where('status', $row['status'])
                ->set('status', Telescope::STATUS_EXPIRED)
                ->set('finished_at', $now)
                ->set('updated_at', $now)
                ->set('version', 'version + 1', false)
                ->update();

            if ($this->db->affectedRows() === 1) {
                $expired[] = $row;
            }
        }

        return $expired;
    }

    /**
     * Every job the observatory should know about, in the agent's shape.
     */
    public function desiredState(): array
    {
        // The patrol nights are the agent's own work, made from its visits: never handed back to it
        $rows = $this->db->table('telescope_jobs')
            ->whereIn('status', Telescope::AGENT_STATUSES)
            ->where('source', Telescope::SOURCE_SITE)
            ->orderBy('created_at', 'ASC')
            ->orderBy('id', 'ASC')
            ->get()
            ->getResultArray();

        return array_map(static function (array $row) {
            $progress = json_decode((string) $row['progress'], true);

            return [
                'id'                => $row['id'],
                'version'           => (int) $row['version'],
                'status'            => $row['status'],
                'cancelRequested'   => $row['cancel_requested_at'] !== null,
                'held'              => (bool) $row['held'],
                'pinned'            => (bool) $row['pinned'],
                'priority'          => (int) $row['priority'],
                'targetName'        => $row['target_name'],
                'ra'                => (float) $row['ra'],
                'dec'               => (float) $row['dec'],
                'plan'              => json_decode($row['plan'], true) ?: [],
                'minAltitude'       => (float) $row['min_altitude'],
                'minMoonSeparation' => $row['min_moon_separation'] === null ? null : (int) $row['min_moon_separation'],
                'validUntil'        => $row['valid_until'],
                'progress'          => is_array($progress) ? $progress : (object) [],
                // The frames up to it are in `progress`: an agent that lost its database doesn't count them twice
                'lastFrameAt'       => $row['last_frame_at'] === null ? null : Time::parse($row['last_frame_at'], 'UTC')->format('Y-m-d\TH:i:s\Z'),
                'lastSeq'           => (int) $row['last_seq'],
                'createdAt'         => Time::parse($row['created_at'], 'UTC')->format('Y-m-d\TH:i:s\Z'),
            ];
        }, $rows);
    }

    /**
     * Applies the agent's updates in order.
     *
     * @param list<mixed> $updates [{jobId, seq, type, time, payload?}]
     *
     * @return array{results: list<array>, stopped: bool} one result per processed update:
     *               {jobId, seq, result: applied|ignored|duplicate|gap|unknown_job|invalid, lastSeq?};
     *               `stopped` — a gap ended the batch, the rest was not processed
     */
    public function applyUpdates(array $updates): array
    {
        $results = [];

        foreach (array_slice($updates, 0, self::MAX_BATCH) as $update) {
            $result    = $this->applyOne($update);
            $results[] = $result;

            if ($result['result'] === 'gap') {
                return ['results' => $results, 'stopped' => true];
            }
        }

        return ['results' => $results, 'stopped' => false];
    }

    /**
     * E-mails the batch made due (first frames, completed), collected so they go out after the
     * transactions. Each job appears once per kind.
     *
     * @return list<array{kind: string, job: array}>
     */
    public function notifications(): array
    {
        return $this->notifications;
    }

    private function applyOne(mixed $update): array
    {
        $jobId = is_array($update) && is_string($update['jobId'] ?? null) ? $update['jobId'] : null;
        $seq   = is_array($update) && is_int($update['seq'] ?? null) ? $update['seq'] : null;
        $type  = is_array($update) && is_string($update['type'] ?? null) ? $update['type'] : null;
        $time  = is_array($update) && is_string($update['time'] ?? null) ? $this->parseTime($update['time']) : null;

        if ($jobId === null || $seq === null || $seq < 1 || !in_array($type, self::TYPES, true) || $time === null
            || (isset($update['payload']) && !is_array($update['payload']))) {
            return ['jobId' => $jobId, 'seq' => $seq, 'result' => 'invalid'];
        }

        $payload = $update['payload'] ?? [];

        // The job may change under us (a cancel, an edit): re-read and retry a couple of times
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $row = $this->db->table('telescope_jobs')->where('id', $jobId)->get()->getRowArray();

            // A patrol night is never in the desired state: the agent can't have updates for it
            if (!$row || $row['source'] !== Telescope::SOURCE_SITE) {
                return ['jobId' => $jobId, 'seq' => $seq, 'result' => 'unknown_job'];
            }

            $lastSeq = (int) $row['last_seq'];

            if ($seq <= $lastSeq) {
                return ['jobId' => $jobId, 'seq' => $seq, 'result' => 'duplicate', 'lastSeq' => $lastSeq];
            }

            if ($seq > $lastSeq + 1) {
                return ['jobId' => $jobId, 'seq' => $seq, 'result' => 'gap', 'lastSeq' => $lastSeq];
            }

            [$changes, $applied] = $this->transition($row, $type, $payload, $time);

            $this->db->transStart();

            $builder = $this->db->table('telescope_jobs')
                ->where('id', $jobId)
                ->where('last_seq', $lastSeq)
                ->where('status', $row['status'])
                ->set('last_seq', $seq)
                ->set('updated_at', Time::now('UTC')->toDateTimeString());

            foreach ($changes as $field => $value) {
                $builder->set($field, $value);
            }

            $builder->update();

            if ($this->db->affectedRows() !== 1) {
                $this->db->transComplete();

                continue;
            }

            $this->db->table('telescope_job_updates')->insert([
                'job_id'     => $jobId,
                'seq'        => $seq,
                'type'       => $type,
                'applied'    => $applied ? 1 : 0,
                'payload'    => $payload ? json_encode($payload, JSON_UNESCAPED_UNICODE) : null,
                'time'       => $time,
                'created_at' => Time::now('UTC')->toDateTimeString(),
            ]);

            $this->db->transComplete();

            if (!$this->db->transStatus()) {
                throw new \RuntimeException("Could not apply update {$seq} of job {$jobId}");
            }

            if ($applied) {
                $this->collectNotification($row, $type, $changes);
            }

            return ['jobId' => $jobId, 'seq' => $seq, 'result' => $applied ? 'applied' : 'ignored'];
        }

        throw new \RuntimeException("Job {$jobId} kept changing while applying update {$seq}");
    }

    /**
     * What an update does to a job in its current status.
     *
     * @return array{0: array<string, mixed>, 1: bool} the column changes and whether it applies
     */
    private function transition(array $row, string $type, array $payload, string $time): array
    {
        $status = $row['status'];
        $final  = in_array($status, Telescope::FINAL_STATUSES, true);

        switch ($type) {
            case 'accepted':
                if ($status === Telescope::STATUS_APPROVED) {
                    return [['status' => Telescope::STATUS_QUEUED, 'accepted_at' => $time], true];
                }
                break;

            case 'started':
                if ($status === Telescope::STATUS_QUEUED) {
                    return [['status' => Telescope::STATUS_RUNNING, 'started_at' => $row['started_at'] ?? $time], true];
                }
                break;

            case 'night_ended':
                if ($status === Telescope::STATUS_RUNNING) {
                    return [['status' => Telescope::STATUS_QUEUED], true];
                }
                break;

            case 'completed':
                if (in_array($status, [Telescope::STATUS_QUEUED, Telescope::STATUS_RUNNING], true)) {
                    return [['status' => Telescope::STATUS_COMPLETED, 'finished_at' => $time], true];
                }
                break;

            case 'failed':
                if (!$final && $status !== Telescope::STATUS_PENDING) {
                    $reason = is_string($payload['reason'] ?? null) ? mb_substr($payload['reason'], 0, Telescope::MAX_REASON) : null;

                    return [['status' => Telescope::STATUS_FAILED, 'status_reason' => $reason, 'finished_at' => $time], true];
                }
                break;

            case 'cancelled':
                // From `approved` too: the agent may confirm a cancel of a job whose "accepted" never
                // reached the site, and the job must not stay active with its cancel asked for good
                if ($row['cancel_requested_at'] !== null && in_array($status, Telescope::AGENT_STATUSES, true)) {
                    return [['status' => Telescope::STATUS_CANCELLED, 'finished_at' => $time], true];
                }
                break;

            case 'progress':
                $progress = $this->progress($payload['progress'] ?? null);

                if ($progress === null) {
                    break;
                }

                // Any status, final ones too: a frame captured just before a cancel still counts
                $changes   = ['progress' => json_encode($progress ?: (object) [])];
                $frameTime = is_string($payload['frameTime'] ?? null) ? $this->parseTime($payload['frameTime']) : null;

                if ($frameTime !== null) {
                    if ($row['first_frame_at'] === null || $frameTime < $row['first_frame_at']) {
                        $changes['first_frame_at'] = $frameTime;
                    }

                    if ($row['last_frame_at'] === null || $frameTime > $row['last_frame_at']) {
                        $changes['last_frame_at'] = $frameTime;
                    }
                }

                return [$changes, true];
        }

        return [[], false];
    }

    /**
     * @return array<string, int>|null the sanitized counts, null when the report is malformed
     */
    private function progress(mixed $value): ?array
    {
        if (!is_array($value) || count($value) > self::MAX_PROGRESS_FILTERS || ($value !== [] && array_is_list($value))) {
            return null;
        }

        $progress = [];

        foreach ($value as $filter => $count) {
            if (!is_string($filter) || $filter === '' || strlen($filter) > 10 || !is_int($count) || $count < 0 || $count > self::MAX_PROGRESS_COUNT) {
                return null;
            }

            $progress[$filter] = $count;
        }

        return $progress;
    }

    private function collectNotification(array $row, string $type, array $changes): void
    {
        $job = array_merge($row, $changes);

        if ($type === 'completed') {
            $this->notifications[] = ['kind' => 'completed', 'job' => $job];
        } elseif ($type === 'progress' && $row['first_frame_at'] === null && isset($changes['first_frame_at'])
            && !in_array($row['status'], Telescope::FINAL_STATUSES, true)) {
            $this->notifications[] = ['kind' => 'first_frames', 'job' => $job];
        }
    }

    /** ISO 8601 → 'Y-m-d H:i:s' UTC, null when unparsable */
    private function parseTime(string $value): ?string
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/', $value)) {
            return null;
        }

        try {
            return Time::parse($value, 'UTC')->setTimezone('UTC')->toDateTimeString();
        } catch (\Throwable) {
            return null;
        }
    }
}
