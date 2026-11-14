<?php

namespace App\Libraries;

use App\Models\ObservatoryNightPlansModel;
use App\Models\TelescopeJobsModel;
use CodeIgniter\Database\BaseConnection;
use CodeIgniter\I18n\Time;
use Config\Database;
use Config\Telescope;
use Throwable;

/**
 * The supernova patrol as jobs (FEAT-30 §4.10, decision of 2026-11-10: "a job is a job, whoever
 * made it"). The agent plans the patrol by itself and reports its visits; the portal turns them
 * into one job per night (`source` = patrol, `night`):
 *
 * - the job appears with the night's first reported visit — a cloudy night leaves nothing;
 * - every visit is linked to it; `visits_done`, `progress` (frames per filter) and the frame
 *   window follow the visits; `visits_planned` follows the agent's plan of that night (never
 *   shrinks: a target already shot drops out of later plans);
 * - it is `running` while its night lasts and `completed` after the night's dawn (or once the
 *   next night began, when the plan with the dawn is missing).
 *
 * The agent never gets these jobs in its desired state: the patrol is its own, it doesn't accept,
 * cancel or count them. The site can't cancel, edit or pause them either.
 */
class PatrolNights
{
    /** Visits in one report */
    public const MAX_VISITS = 500;

    /** A visit's frames, at most */
    private const MAX_FRAMES = 1000;

    /** The name stored with a patrol night (the site shows its own, translated) */
    public const TARGET_NAME = 'Supernova patrol';

    private BaseConnection $db;

    public function __construct(?BaseConnection $db = null)
    {
        $this->db = $db ?? Database::connect();
    }

    /**
     * Stores the reported visits. A visit is reported while it is being shot and again once
     * it is over, so a known one (target + start time) takes the larger frame count and the
     * later last frame; otherwise it is a duplicate.
     *
     * @param list<mixed> $visits [{target: id, time: ISO 8601 (the first frame), frames: int,
     *                            lastFrame?: ISO 8601}]
     *
     * @return array{recorded: int, updated: int, duplicates: int, invalid: int}
     */
    public function record(array $visits): array
    {
        $counts  = ['recorded' => 0, 'updated' => 0, 'duplicates' => 0, 'invalid' => 0];
        $targets = [];
        $nights  = [];
        $now     = Time::now('UTC');
        $latest  = $now->addDays(1)->toDateTimeString();
        $known   = array_map('intval', array_column($this->db->table('patrol_targets')->select('id')->get()->getResultArray(), 'id'));

        foreach (array_slice($visits, 0, self::MAX_VISITS) as $visit) {
            $target    = is_array($visit) && is_int($visit['target'] ?? null) ? $visit['target'] : null;
            $frames    = is_array($visit) && is_int($visit['frames'] ?? null) ? $visit['frames'] : null;
            $time      = is_array($visit) ? self::parseTime($visit['time'] ?? null) : null;
            $lastFrame = is_array($visit) && isset($visit['lastFrame']) ? self::parseTime($visit['lastFrame']) : null;

            if ($target === null || !in_array($target, $known, true) || $time === null || $time > $latest
                || $frames === null || $frames < 1 || $frames > self::MAX_FRAMES
                || (is_array($visit) && isset($visit['lastFrame']) && $lastFrame === null)) {
                $counts['invalid']++;

                continue;
            }

            $lastFrame = max($lastFrame ?? $time, $time);
            $existing  = $this->db->table('patrol_visits')->where('target_id', $target)->where('time', $time)->get()->getRowArray();

            if ($existing) {
                $moreFrames = $frames > (int) $existing['frames'];
                $later      = $existing['last_frame'] === null || $lastFrame > $existing['last_frame'];

                if (!$moreFrames && !$later) {
                    $counts['duplicates']++;

                    continue;
                }

                $this->db->table('patrol_visits')->where('id', $existing['id'])->update([
                    'frames'     => max($frames, (int) $existing['frames']),
                    'last_frame' => $later ? $lastFrame : $existing['last_frame'],
                ]);
                $counts['updated']++;
            } else {
                $this->db->table('patrol_visits')->insert([
                    'target_id'  => $target,
                    'time'       => $time,
                    'last_frame' => $lastFrame,
                    'frames'     => $frames,
                    'created_at' => $now->toDateTimeString(),
                ]);
                $counts['recorded']++;
            }

            $targets[$target]                                                            = true;
            $nights[ObservatoryNightPlansModel::currentNight(Time::parse($time, 'UTC'))] = true;
        }

        foreach (array_keys($targets) as $target) {
            $this->refreshTarget($target);
        }

        foreach (array_keys($nights) as $night) {
            $this->refreshNight($night);
        }

        return $counts;
    }

    /**
     * The night's job made up to date with its visits and plan; made first when the night has
     * visits but no job yet. Nothing for a night without visits.
     *
     * @return string|null the job id
     */
    public function refreshNight(string $night): ?string
    {
        [$from, $to] = self::nightBounds($night);

        $visits = $this->db->table('patrol_visits')
            ->where('time >=', $from)
            ->where('time <', $to)
            ->get()
            ->getResultArray();

        if (!$visits) {
            return null;
        }

        $jobId = $this->jobOf($night, min(array_column($visits, 'time')));

        $this->db->table('patrol_visits')
            ->where('time >=', $from)
            ->where('time <', $to)
            ->groupStart()->where('job_id', null)->orWhere('job_id !=', $jobId)->groupEnd()
            ->update(['job_id' => $jobId]);

        $visited  = array_map('intval', array_column($visits, 'target_id'));
        $frames   = array_sum(array_map('intval', array_column($visits, 'frames')));
        $last     = max(array_map(static fn (array $v) => $v['last_frame'] ?? $v['time'], $visits));
        $row      = $this->db->table('telescope_jobs')->where('id', $jobId)->get()->getRowArray();
        $planned  = max((int) $row['visits_planned'], count(array_unique($visited)) + count(array_diff($this->plannedTargets($night), $visited)));

        $this->db->table('telescope_jobs')->where('id', $jobId)->update([
            'visits_done'    => count($visits),
            'visits_planned' => max($planned, count($visits)),
            'progress'       => json_encode(['L' => $frames]),
            'first_frame_at' => min(array_column($visits, 'time')),
            'last_frame_at'  => $last,
            'updated_at'     => Time::now('UTC')->toDateTimeString(),
        ]);

        $this->closeFinished();

        return $jobId;
    }

    /**
     * Patrol nights that are over become `completed`: after the dawn of their night (from the
     * agent's plan of it), or once a later night began.
     *
     * @return int how many were closed
     */
    public function closeFinished(): int
    {
        $current = ObservatoryNightPlansModel::currentNight();
        $now     = Time::now('UTC');
        $rows    = $this->db->table('telescope_jobs')
            ->where('source', Telescope::SOURCE_PATROL)
            ->where('status', Telescope::STATUS_RUNNING)
            ->get()
            ->getResultArray();
        $closed = 0;

        foreach ($rows as $row) {
            $dawn = $this->dawnOf($row['night']);
            $over = $row['night'] < $current || ($dawn !== null && $now->isAfter($dawn));

            if (!$over) {
                continue;
            }

            $this->db->table('telescope_jobs')
                ->where('id', $row['id'])
                ->where('status', Telescope::STATUS_RUNNING)
                ->update([
                    'status'      => Telescope::STATUS_COMPLETED,
                    'finished_at' => $row['last_frame_at'] ?? $now->toDateTimeString(),
                    'updated_at'  => $now->toDateTimeString(),
                ]);

            $closed += $this->db->affectedRows();
        }

        return $closed;
    }

    /**
     * The visits of a patrol night for its job page, in the order they were shot. A galaxy that is
     * in our catalog too (`M 51` → `M_51`) carries its `object`, the link to its page.
     *
     * @return list<array{target: array, time: string, lastFrame: string|null, frames: int}>
     */
    public function visitsOf(string $jobId): array
    {
        $rows = $this->db->table('patrol_visits v')
            ->select('v.time, v.last_frame, v.frames, t.id AS target_id, t.name, t.ra, t.dec, t.object_type, t.magnitude')
            ->join('patrol_targets t', 't.id = v.target_id')
            ->where('v.job_id', $jobId)
            ->orderBy('v.time', 'ASC')
            ->get()
            ->getResultArray();

        $iso     = static fn (?string $value) => $value ? Time::parse($value, 'UTC')->format('Y-m-d\TH:i:s\Z') : null;
        $catalog = static fn (string $name) => str_replace(' ', '_', trim($name));
        $names   = array_values(array_unique(array_map(static fn (array $row) => $catalog($row['name']), $rows)));
        $objects = $names ? array_column(
            $this->db->table('objects')->select('catalog_name')->whereIn('catalog_name', $names)->where('deleted_at', null)->get()->getResultArray(),
            'catalog_name',
        ) : [];

        return array_map(static fn (array $row) => [
            'target'    => [
                'id'        => (int) $row['target_id'],
                'name'      => $row['name'],
                'object'    => in_array($catalog($row['name']), $objects, true) ? $catalog($row['name']) : null,
                'ra'        => (float) $row['ra'],
                'dec'       => (float) $row['dec'],
                'type'      => $row['object_type'],
                'magnitude' => $row['magnitude'] === null ? null : (float) $row['magnitude'],
            ],
            'time'      => $iso($row['time']),
            'lastFrame' => $iso($row['last_frame']),
            'frames'    => (int) $row['frames'],
        ], $rows);
    }

    /** The night's job, made when it doesn't exist yet (a concurrent report may make it first) */
    private function jobOf(string $night, string $firstVisit): string
    {
        $existing = $this->db->table('telescope_jobs')->select('id')->where('night', $night)->get()->getRowArray();

        if ($existing) {
            return $existing['id'];
        }

        $settings = TelescopeSettings::load();
        $model    = new TelescopeJobsModel();

        try {
            $model->insert([
                'source'       => Telescope::SOURCE_PATROL,
                'user_id'      => null,
                'target_name'  => self::TARGET_NAME,
                'ra'           => null,
                'dec'          => null,
                'mode'         => 'pro',
                'plan'         => json_encode([['filter' => 'L', 'exposure' => $settings->patrolExposure, 'count' => $settings->patrolCount]]),
                'min_altitude' => $settings->patrolMinAltitude,
                'valid_until'  => $night,
                'night'        => $night,
                'status'       => Telescope::STATUS_RUNNING,
                'version'      => 1,
                'progress'     => json_encode(['L' => 0]),
                'accepted_at'  => $firstVisit,
                'started_at'   => $firstVisit,
            ]);

            return $model->getInsertID();
        } catch (Throwable $e) {
            // The unique night: another report made it meanwhile
            $existing = $this->db->table('telescope_jobs')->select('id')->where('night', $night)->get()->getRowArray();

            if ($existing) {
                return $existing['id'];
            }

            throw $e;
        }
    }

    /** `last_visit_at` and `visits` of a target, from its visits */
    private function refreshTarget(int $target): void
    {
        $stats = $this->db->table('patrol_visits')
            ->select('COUNT(*) AS visits, MAX(time) AS last_visit')
            ->where('target_id', $target)
            ->get()
            ->getRowArray();

        $this->db->table('patrol_targets')->where('id', $target)->update([
            'visits'        => (int) $stats['visits'],
            'last_visit_at' => $stats['last_visit'],
            'updated_at'    => Time::now('UTC')->toDateTimeString(),
        ]);
    }

    /** @return list<int> the patrol targets in the agent's latest plan of the night */
    private function plannedTargets(string $night): array
    {
        $plan    = (new ObservatoryNightPlansModel())->plan($night);
        $planned = is_array($plan['patrol']['planned'] ?? null) ? $plan['patrol']['planned'] : [];

        return array_values(array_unique(array_filter(array_map(
            static fn ($t) => is_array($t) && is_int($t['id'] ?? null) ? $t['id'] : null,
            $planned,
        ), static fn ($id) => $id !== null)));
    }

    /** The end of the night's nautical darkness from the agent's plan, or null */
    private function dawnOf(?string $night): ?Time
    {
        if ($night === null) {
            return null;
        }

        $plan = (new ObservatoryNightPlansModel())->plan($night);
        $end  = self::parseTime($plan['darkness']['nauticalEnd'] ?? null);

        return $end === null ? null : Time::parse($end, 'UTC');
    }

    /**
     * The UTC window of a night: local noon of its evening → the next local noon.
     *
     * @return array{0: string, 1: string}
     */
    public static function nightBounds(string $night): array
    {
        $noon = Time::parse($night . ' 12:00:00', Telescope::TIME_ZONE)->setTimezone('UTC');

        return [$noon->toDateTimeString(), $noon->addDays(1)->toDateTimeString()];
    }

    /** ISO 8601 → 'Y-m-d H:i:s' UTC, null when unparsable */
    private static function parseTime(mixed $value): ?string
    {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/', $value)) {
            return null;
        }

        try {
            return Time::parse($value, 'UTC')->setTimezone('UTC')->toDateTimeString();
        } catch (Throwable) {
            return null;
        }
    }
}
