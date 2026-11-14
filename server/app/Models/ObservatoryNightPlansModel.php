<?php

namespace App\Models;

use CodeIgniter\I18n\Time;
use Config\Telescope;

/**
 * ObservatoryNightPlansModel
 *
 * Tonight's plan as the observatory agent built it (FEAT-30 §4.4, §4.10): one row per night (the
 * local date of the evening), replaced whenever the agent rebuilds the plan. Kept for 90 days.
 */
class ObservatoryNightPlansModel extends ApplicationBaseModel
{
    protected $table            = 'observatory_night_plans';
    protected $primaryKey       = 'night';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $allowedFields    = ['night', 'plan', 'updated_at'];

    public const KEEP_DAYS = 90;

    /** The observing night a moment belongs to: local noon → next noon, named by the evening */
    public static function currentNight(?Time $now = null): string
    {
        return ($now ?? Time::now())->setTimezone(Telescope::TIME_ZONE)->subHours(12)->format('Y-m-d');
    }

    /**
     * The stored plan of a night as the agent sent it, or null.
     */
    public function plan(string $night): ?array
    {
        $row = $this->db->table($this->table)->where('night', $night)->get()->getRowArray();

        if (!$row) {
            return null;
        }

        $plan = json_decode((string) $row['plan'], true);

        return is_array($plan) ? $plan + ['_updatedAt' => $row['updated_at']] : null;
    }

    /**
     * What everyone may see of a night's plan: darkness, the Moon, the planned jobs (target and
     * author's name + avatar, only jobs visible to everyone) and the patrol targets.
     * No scores, reasons, warnings or Ekos state — those are the admins'.
     */
    public function publicView(string $night, array $plan): array
    {
        $planned = [];

        foreach (is_array($plan['jobs'] ?? null) ? $plan['jobs'] : [] as $job) {
            if (is_array($job) && ($job['planned'] ?? false) === true && is_string($job['id'] ?? null)) {
                $planned[$job['id']] = array_values(array_filter(is_array($job['groups'] ?? null) ? $job['groups'] : [], 'is_string'));
            }
        }

        $jobs = [];

        if ($planned) {
            $rows = $this->db->table('telescope_jobs j')
                ->select('j.id, j.user_id, j.target_name, j.object, u.name AS author_name, u.avatar AS author_avatar')
                ->join('users u', 'u.id = j.user_id', 'left')
                ->whereIn('j.id', array_keys($planned))
                ->whereIn('j.status', Telescope::PUBLIC_STATUSES)
                ->get()
                ->getResultArray();
            $byId = array_column($rows, null, 'id');

            // In the plan's order (the order Ekos gets them)
            foreach (array_keys($planned) as $id) {
                if (isset($byId[$id])) {
                    $jobs[] = [
                        'id'         => $id,
                        'targetName' => $byId[$id]['target_name'],
                        'object'     => $byId[$id]['object'],
                        'groups'     => $planned[$id],
                        'author'     => [
                            'id'     => $byId[$id]['user_id'],
                            'name'   => (string) ($byId[$id]['author_name'] ?? ''),
                            'avatar' => $byId[$id]['author_avatar'] ?? null,
                        ],
                    ];
                }
            }
        }

        $patrol  = is_array($plan['patrol'] ?? null) ? $plan['patrol'] : [];
        $targets = array_values(array_filter(array_map(
            static fn ($t) => is_array($t) && is_string($t['name'] ?? null) ? $t['name'] : null,
            is_array($patrol['planned'] ?? null) ? $patrol['planned'] : []
        )));
        $string = static fn ($v) => is_string($v) ? $v : null;
        $dark   = is_array($plan['darkness'] ?? null) ? $plan['darkness'] : [];

        return [
            'night'    => $night,
            'builtAt'  => $string($plan['builtAt'] ?? null),
            'darkness' => [
                'nauticalStart' => $string($dark['nauticalStart'] ?? null),
                'nauticalEnd'   => $string($dark['nauticalEnd'] ?? null),
                'astroStart'    => $string($dark['astroStart'] ?? null),
                'astroEnd'      => $string($dark['astroEnd'] ?? null),
            ],
            'moon'     => ['illumination' => is_numeric($plan['moon']['illumination'] ?? null) ? (float) $plan['moon']['illumination'] : null],
            'jobs'     => $jobs,
            'patrol'   => ['enabled' => (bool) ($patrol['enabled'] ?? false), 'targets' => $targets],
        ];
    }

    public function store(string $night, array $plan): void
    {
        $this->db->table($this->table)->replace([
            'night'      => $night,
            'plan'       => json_encode($plan, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'updated_at' => Time::now('UTC')->toDateTimeString(),
        ]);

        $this->db->table($this->table)
            ->where('night <', Time::now('UTC')->subDays(self::KEEP_DAYS)->format('Y-m-d'))
            ->delete();
    }
}
