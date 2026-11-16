<?php

namespace App\Libraries;

use Config\Database;

/**
 * The telescope job settings from `observatory_settings`, typed. A missing or broken
 * value falls back to the default, so a half-filled table never opens a limit — but never below
 * the 15° altitude floor either.
 */
class TelescopeSettings
{
    /** Same keys and defaults as the `AddTelescopeJobs` migration seeds (a test keeps them equal) */
    public const DEFAULTS = [
        'autonomous_mode'           => '0',
        'altitude_floor'            => '15',
        'job_default_min_altitude'  => '30',
        'job_max_exposure_hours'    => '2',
        'job_max_active'            => '3',
        'job_exposure_min'          => '30',
        'job_exposure_max'          => '600',
        'job_max_frames_per_filter' => '100',
        'filters'                   => 'L,R,G,B,H,O,S',
    ];

    /** The physical floor of the mount/site: no setting can plan lower (§4.11) */
    public const HARD_ALTITUDE_FLOOR = 15.0;

    public readonly bool $autonomousMode;
    public readonly float $altitudeFloor;
    public readonly float $defaultMinAltitude;
    public readonly int $maxExposureSeconds;
    public readonly int $maxActiveJobs;
    public readonly int $exposureMin;
    public readonly int $exposureMax;
    public readonly int $maxFramesPerFilter;
    /** @var list<string> */
    public readonly array $filters;

    /**
     * @param array<string, string|null> $values raw `observatory_settings` key => value
     */
    public function __construct(array $values)
    {
        $int = static function (string $key, int $min, int $max) use ($values): int {
            $raw = $values[$key] ?? null;

            if (!is_numeric($raw) || (int) $raw < $min || (int) $raw > $max) {
                return (int) self::DEFAULTS[$key];
            }

            return (int) $raw;
        };

        $this->autonomousMode = ($values['autonomous_mode'] ?? '0') === '1';

        $floor               = is_numeric($values['altitude_floor'] ?? null) ? (float) $values['altitude_floor'] : (float) self::DEFAULTS['altitude_floor'];
        $this->altitudeFloor = max(self::HARD_ALTITUDE_FLOOR, min($floor, 60.0));

        $default                  = is_numeric($values['job_default_min_altitude'] ?? null) ? (float) $values['job_default_min_altitude'] : (float) self::DEFAULTS['job_default_min_altitude'];
        $this->defaultMinAltitude = max($this->altitudeFloor, min($default, 80.0));

        $this->maxExposureSeconds = $int('job_max_exposure_hours', 1, 24) * 3600;
        $this->maxActiveJobs      = $int('job_max_active', 1, 50);
        $this->exposureMin        = $int('job_exposure_min', 1, 3600);
        $this->exposureMax        = max($this->exposureMin, $int('job_exposure_max', 1, 3600));
        $this->maxFramesPerFilter = $int('job_max_frames_per_filter', 1, 1000);

        $filters = array_values(array_filter(array_map('trim', explode(',', (string) ($values['filters'] ?? '')))));

        $this->filters = $filters ?: explode(',', self::DEFAULTS['filters']);

    }

    public static function load(): self
    {
        $rows = Database::connect()
            ->table('observatory_settings')
            ->whereIn('key', array_keys(self::DEFAULTS))
            ->get()
            ->getResultArray();

        return new self(array_column($rows, 'value', 'key'));
    }

    /**
     * What the job form needs to know (public: no secrets in it).
     */
    public function forForm(): array
    {
        return [
            'filters'            => $this->filters,
            'altitudeFloor'      => $this->altitudeFloor,
            'defaultMinAltitude' => $this->defaultMinAltitude,
            'maxExposureSeconds' => $this->maxExposureSeconds,
            'maxActiveJobs'      => $this->maxActiveJobs,
            'exposureMin'        => $this->exposureMin,
            'exposureMax'        => $this->exposureMax,
            'maxFramesPerFilter' => $this->maxFramesPerFilter,
        ];
    }
}
