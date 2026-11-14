<?php

namespace App\Libraries;

use App\Models\ObservatoryNightPlansModel;
use CodeIgniter\I18n\Time;
use Config\Telescope;

/**
 * Checks a telescope job (the portal-owned fields: target, plan, constraints) and turns the API
 * input into table values. Pure: no database, so every rule is unit-tested.
 *
 * A user's job must fit the limits from the settings (exposure range, frames per filter, total
 * exposure); a `telescope.manage` holder's job only the physical bounds (`Config\Telescope`
 * MAX_*). The altitude floor and the wheel's filters bind everybody.
 */
class TelescopeJobValidator
{
    /** @var array<string, string> field => message */
    private array $errors = [];

    public function __construct(private readonly TelescopeSettings $settings, private readonly bool $unlimited = false)
    {
    }

    /**
     * @param array $input camelCase API fields: targetName, object?, ra, dec, mode, preset?, plan?,
     *                     minAltitude?, minMoonSeparation?, validUntil?
     *
     * @return array|null the table values, or null when invalid (see errors())
     */
    public function validate(array $input): ?array
    {
        $this->errors = [];

        $name = is_string($input['targetName'] ?? null) ? trim($input['targetName']) : '';

        // The name goes into the agent's Ekos XML files: control characters and non-characters
        // (invalid in XML 1.0) or broken UTF-8 would break the whole night's schedule
        if ($name === '' || mb_strlen($name) > Telescope::MAX_TARGET_NAME
            || preg_match('/[\p{Cc}\p{Cs}\x{FFFE}\x{FFFF}]/u', $name) !== 0) {
            $this->errors['targetName'] = lang('Telescope.targetNameInvalid', [Telescope::MAX_TARGET_NAME]);
        }

        $ra  = $this->number($input['ra'] ?? null);
        $dec = $this->number($input['dec'] ?? null);

        if ($ra === null || $ra < 0 || $ra >= 360) {
            $this->errors['ra'] = lang('Telescope.raInvalid');
        }

        if ($dec === null || $dec < -90 || $dec > 90) {
            $this->errors['dec'] = lang('Telescope.decInvalid');
        }

        $object = is_string($input['object'] ?? null) && trim($input['object']) !== '' ? trim($input['object']) : null;

        [$mode, $preset, $plan] = $this->plan($input);

        $minAltitude = $this->settings->defaultMinAltitude;

        if (($input['minAltitude'] ?? null) !== null && $input['minAltitude'] !== '') {
            $minAltitude = $this->number($input['minAltitude']);

            if ($minAltitude === null || $minAltitude < $this->settings->altitudeFloor || $minAltitude > Telescope::MAX_MIN_ALTITUDE) {
                $this->errors['minAltitude'] = lang('Telescope.minAltitudeInvalid', [$this->settings->altitudeFloor, Telescope::MAX_MIN_ALTITUDE]);
            }
        }

        $moon = null;

        if (($input['minMoonSeparation'] ?? null) !== null && $input['minMoonSeparation'] !== '') {
            $moon = $this->number($input['minMoonSeparation']);

            if ($moon === null || $moon != (int) $moon || $moon < 0 || $moon > 180) {
                $this->errors['minMoonSeparation'] = lang('Telescope.moonSeparationInvalid');
            }
        }

        $validUntil = null;

        if (($input['validUntil'] ?? null) !== null && $input['validUntil'] !== '') {
            $validUntil = is_string($input['validUntil']) ? $this->date($input['validUntil']) : null;
            // "Valid until X" covers the night that starts on the evening of X (as the expiry
            // counts it): at 03:00 on the 11th the night of the 10th is still on
            $tonight = ObservatoryNightPlansModel::currentNight();

            if ($validUntil === null || $validUntil < $tonight) {
                $this->errors['validUntil'] = lang('Telescope.validUntilInvalid');
            }
        }

        if ($this->errors) {
            return null;
        }

        return [
            'target_name'         => $name,
            'object'              => $object,
            'ra'                  => round($ra, 5),
            'dec'                 => round($dec, 5),
            'mode'                => $mode,
            'preset'              => $preset,
            'plan'                => json_encode($plan),
            'min_altitude'        => round($minAltitude, 1),
            'min_moon_separation' => $moon === null ? null : (int) $moon,
            'valid_until'         => $validUntil,
        ];
    }

    /** @return array<string, string> */
    public function errors(): array
    {
        return $this->errors;
    }

    /**
     * Total exposure of a plan, seconds.
     *
     * @param list<array{filter: string, exposure: int, count: int}> $plan
     */
    public static function totalSeconds(array $plan): int
    {
        return array_sum(array_map(static fn (array $row) => $row['exposure'] * $row['count'], $plan));
    }

    /**
     * Presets whose filters are all in the wheel, as plan rows.
     *
     * @return array<string, list<array{filter: string, exposure: int, count: int}>>
     */
    public static function presets(TelescopeSettings $settings): array
    {
        $presets = [];

        foreach (Telescope::PRESETS as $key => $rows) {
            if (array_diff(array_keys($rows), $settings->filters)) {
                continue;
            }

            $presets[$key] = array_map(
                static fn (string $filter, array $row) => ['filter' => $filter, 'exposure' => $row[0], 'count' => $row[1]],
                array_keys($rows),
                $rows,
            );
        }

        return $presets;
    }

    /**
     * @return array{0: string, 1: string|null, 2: list<array{filter: string, exposure: int, count: int}>}
     */
    private function plan(array $input): array
    {
        $mode = $input['mode'] ?? 'simple';

        if ($mode === 'simple') {
            $presets = self::presets($this->settings);
            $preset  = is_string($input['preset'] ?? null) ? $input['preset'] : '';

            if (!isset($presets[$preset])) {
                $this->errors['preset'] = lang('Telescope.presetInvalid');

                return ['simple', null, []];
            }

            $plan = $presets[$preset];
            $this->checkTotal($plan);

            return ['simple', $preset, $plan];
        }

        if ($mode !== 'pro') {
            $this->errors['mode'] = lang('Telescope.modeInvalid');

            return ['pro', null, []];
        }

        $rows = $input['plan'] ?? null;

        if (!is_array($rows) || !array_is_list($rows) || $rows === [] || count($rows) > count($this->settings->filters)) {
            $this->errors['plan'] = lang('Telescope.planEmpty');

            return ['pro', null, []];
        }

        $exposureMin = $this->unlimited ? 1 : $this->settings->exposureMin;
        $exposureMax = $this->unlimited ? Telescope::MAX_EXPOSURE_SECONDS : $this->settings->exposureMax;
        $countMax    = $this->unlimited ? Telescope::MAX_FRAMES_PER_FILTER : $this->settings->maxFramesPerFilter;

        $plan = [];
        $seen = [];

        foreach ($rows as $index => $row) {
            $filter   = is_array($row) && is_string($row['filter'] ?? null) ? $row['filter'] : '';
            $exposure = is_array($row) ? $this->number($row['exposure'] ?? null) : null;
            $count    = is_array($row) ? $this->number($row['count'] ?? null) : null;

            if (!in_array($filter, $this->settings->filters, true)) {
                $this->errors["plan.{$index}.filter"] = lang('Telescope.filterInvalid', [implode(', ', $this->settings->filters)]);
            } elseif (isset($seen[$filter])) {
                $this->errors["plan.{$index}.filter"] = lang('Telescope.filterDuplicate', [$filter]);
            }

            $seen[$filter] = true;

            if ($exposure === null || $exposure != (int) $exposure || $exposure < $exposureMin || $exposure > $exposureMax) {
                $this->errors["plan.{$index}.exposure"] = lang('Telescope.exposureInvalid', [$exposureMin, $exposureMax]);
            }

            if ($count === null || $count != (int) $count || $count < 1 || $count > $countMax) {
                $this->errors["plan.{$index}.count"] = lang('Telescope.countInvalid', [$countMax]);
            }

            $plan[] = ['filter' => $filter, 'exposure' => (int) $exposure, 'count' => (int) $count];
        }

        if (!$this->errors) {
            $this->checkTotal($plan);
        }

        return ['pro', null, $plan];
    }

    private function checkTotal(array $plan): void
    {
        if (!$this->unlimited && self::totalSeconds($plan) > $this->settings->maxExposureSeconds) {
            $this->errors['plan'] = lang('Telescope.planTooLong', [$this->settings->maxExposureSeconds / 3600]);
        }
    }

    private function number(mixed $value): ?float
    {
        if (is_int($value) || is_float($value)) {
            return is_finite((float) $value) ? (float) $value : null;
        }

        if (is_string($value) && is_numeric(trim($value))) {
            return (float) trim($value);
        }

        return null;
    }

    private function date(string $value): ?string
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        [$y, $m, $d] = array_map('intval', explode('-', $value));

        return checkdate($m, $d, $y) ? $value : null;
    }
}
