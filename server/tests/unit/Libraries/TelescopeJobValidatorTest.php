<?php

use App\Libraries\TelescopeJobValidator;
use App\Libraries\TelescopeSettings;
use CodeIgniter\I18n\Time;
use CodeIgniter\Test\CIUnitTestCase;
use Config\Telescope;

/**
 * Every rule a job must pass (FEAT-30 §4.1, decision #2): a user within the limits from the
 * settings, a `telescope.manage` holder only within the physical bounds; the altitude floor and
 * the wheel's filters for everybody.
 *
 * @internal
 */
final class TelescopeJobValidatorTest extends CIUnitTestCase
{
    private TelescopeSettings $settings;

    protected function setUp(): void
    {
        parent::setUp();
        $this->settings = new TelescopeSettings(TelescopeSettings::DEFAULTS);
    }

    private function pro(array $plan, array $extra = []): array
    {
        return ['targetName' => 'M 101', 'ra' => 210.80225, 'dec' => 54.34894, 'mode' => 'pro', 'plan' => $plan] + $extra;
    }

    private function validate(array $input, bool $unlimited = false): array
    {
        $validator = new TelescopeJobValidator($this->settings, $unlimited);
        $data      = $validator->validate($input);

        return [$data, $validator->errors()];
    }

    public function testValidProJob(): void
    {
        [$data, $errors] = $this->validate($this->pro([
            ['filter' => 'L', 'exposure' => 300, 'count' => 10],
            ['filter' => 'H', 'exposure' => '600', 'count' => '5'],
        ], ['object' => 'M_101', 'minAltitude' => 35, 'validUntil' => Time::now('Asia/Yekaterinburg')->addDays(10)->format('Y-m-d')]));

        $this->assertSame([], $errors);
        $this->assertSame('M 101', $data['target_name']);
        $this->assertSame('M_101', $data['object']);
        $this->assertSame('pro', $data['mode']);
        $this->assertNull($data['preset']);
        $this->assertSame(35.0, $data['min_altitude']);
        $this->assertSame([
            ['filter' => 'L', 'exposure' => 300, 'count' => 10],
            ['filter' => 'H', 'exposure' => 600, 'count' => 5],
        ], json_decode($data['plan'], true));
    }

    public function testDefaultMinAltitude(): void
    {
        [$data] = $this->validate($this->pro([['filter' => 'L', 'exposure' => 300, 'count' => 10]]));
        $this->assertSame(30.0, $data['min_altitude']);
        $this->assertNull($data['valid_until']);
        $this->assertNull($data['min_moon_separation']);
    }

    public function testSimplePresetsFitTheDefaultLimit(): void
    {
        foreach (array_keys(Telescope::PRESETS) as $preset) {
            [$data, $errors] = $this->validate(['targetName' => 'NGC 7000', 'ra' => 314.7, 'dec' => 44.3, 'mode' => 'simple', 'preset' => $preset]);

            $this->assertSame([], $errors, $preset);
            $this->assertSame($preset, $data['preset']);
            $this->assertLessThanOrEqual(7200, TelescopeJobValidator::totalSeconds(json_decode($data['plan'], true)), $preset);
        }
    }

    public function testUnknownPresetAndMode(): void
    {
        [, $errors] = $this->validate(['targetName' => 'X', 'ra' => 1, 'dec' => 1, 'mode' => 'simple', 'preset' => 'UV']);
        $this->assertArrayHasKey('preset', $errors);

        [, $errors] = $this->validate(['targetName' => 'X', 'ra' => 1, 'dec' => 1, 'mode' => 'expert']);
        $this->assertArrayHasKey('mode', $errors);
    }

    public function testPresetsWithAMissingFilterAreHidden(): void
    {
        $presets = TelescopeJobValidator::presets(new TelescopeSettings(['filters' => 'L,R,G,B']));
        $this->assertSame(['L', 'LRGB', 'RGB'], array_keys($presets));
    }

    public function testTargetNameMustBeValidXmlText(): void
    {
        $row = [['filter' => 'L', 'exposure' => 300, 'count' => 1]];

        foreach (["M\x01 31", "M 31\u{FFFE}", "M 31\xC3", "M\t31"] as $name) {
            [, $errors] = $this->validate(['targetName' => $name, 'ra' => 10, 'dec' => 41, 'mode' => 'pro', 'plan' => $row]);
            $this->assertArrayHasKey('targetName', $errors, bin2hex($name));
        }

        [$data] = $this->validate(['targetName' => 'Туманность «Сердце» & <IC 1805>', 'ra' => 38, 'dec' => 61, 'mode' => 'pro', 'plan' => $row]);
        $this->assertSame('Туманность «Сердце» & <IC 1805>', $data['target_name']);
    }

    public function testTargetAndCoordinates(): void
    {
        [, $errors] = $this->validate(['targetName' => '  ', 'ra' => 360, 'dec' => -90.5, 'mode' => 'pro', 'plan' => [['filter' => 'L', 'exposure' => 300, 'count' => 1]]]);
        $this->assertArrayHasKey('targetName', $errors);
        $this->assertArrayHasKey('ra', $errors);
        $this->assertArrayHasKey('dec', $errors);

        [, $errors] = $this->validate(['targetName' => str_repeat('a', 61), 'ra' => 'abc', 'dec' => null, 'mode' => 'pro', 'plan' => [['filter' => 'L', 'exposure' => 300, 'count' => 1]]]);
        $this->assertArrayHasKey('targetName', $errors);
        $this->assertArrayHasKey('ra', $errors);
        $this->assertArrayHasKey('dec', $errors);
    }

    public function testFiltersOnlyFromTheWheelAndOnce(): void
    {
        [, $errors] = $this->validate($this->pro([
            ['filter' => 'Ha', 'exposure' => 300, 'count' => 1],
            ['filter' => 'L', 'exposure' => 300, 'count' => 1],
            ['filter' => 'L', 'exposure' => 120, 'count' => 1],
        ]));

        $this->assertArrayHasKey('plan.0.filter', $errors);
        $this->assertArrayNotHasKey('plan.1.filter', $errors);
        $this->assertArrayHasKey('plan.2.filter', $errors);
    }

    public function testFiltersFromTheWheelBindAdminsToo(): void
    {
        [, $errors] = $this->validate($this->pro([['filter' => 'V', 'exposure' => 300, 'count' => 1]]), true);
        $this->assertArrayHasKey('plan.0.filter', $errors);
    }

    public function testExposureAndCountLimits(): void
    {
        [, $errors] = $this->validate($this->pro([
            ['filter' => 'L', 'exposure' => 29, 'count' => 1],
            ['filter' => 'R', 'exposure' => 601, 'count' => 1],
            ['filter' => 'G', 'exposure' => 60, 'count' => 101],
            ['filter' => 'B', 'exposure' => 60.5, 'count' => 0],
        ]));

        $this->assertArrayHasKey('plan.0.exposure', $errors);
        $this->assertArrayHasKey('plan.1.exposure', $errors);
        $this->assertArrayHasKey('plan.2.count', $errors);
        $this->assertArrayHasKey('plan.3.exposure', $errors);
        $this->assertArrayHasKey('plan.3.count', $errors);
    }

    public function testBoundaryValuesPass(): void
    {
        [, $errors] = $this->validate($this->pro([
            ['filter' => 'L', 'exposure' => 30, 'count' => 100],
            ['filter' => 'R', 'exposure' => 600, 'count' => 1],
        ]));
        $this->assertSame([], $errors);
    }

    public function testTotalExposureLimit(): void
    {
        // 2 h exactly passes, a second more does not
        [, $errors] = $this->validate($this->pro([['filter' => 'L', 'exposure' => 120, 'count' => 60]]));
        $this->assertSame([], $errors);

        [, $errors] = $this->validate($this->pro([
            ['filter' => 'L', 'exposure' => 120, 'count' => 60],
            ['filter' => 'R', 'exposure' => 30, 'count' => 1],
        ]));
        $this->assertArrayHasKey('plan', $errors);
    }

    public function testAdminsAreNotLimitedButBounded(): void
    {
        [, $errors] = $this->validate($this->pro([
            ['filter' => 'L', 'exposure' => 1200, 'count' => 200],
            ['filter' => 'R', 'exposure' => 10, 'count' => 1],
        ]), true);
        $this->assertSame([], $errors);

        [, $errors] = $this->validate($this->pro([['filter' => 'L', 'exposure' => 1801, 'count' => 501]]), true);
        $this->assertArrayHasKey('plan.0.exposure', $errors);
        $this->assertArrayHasKey('plan.0.count', $errors);
    }

    public function testPlanShape(): void
    {
        foreach ([[], null, 'L 20x300', ['filter' => 'L'], [['filter' => 'L', 'exposure' => 300, 'count' => 1]] + [5 => 'x']] as $plan) {
            [, $errors] = $this->validate($this->pro([]) + ['plan' => $plan]);
            $this->assertNotEmpty($errors);
        }

        // more rows than the wheel has slots
        $rows = array_fill(0, 8, ['filter' => 'L', 'exposure' => 300, 'count' => 1]);
        [, $errors] = $this->validate($this->pro($rows));
        $this->assertArrayHasKey('plan', $errors);
    }

    public function testAltitudeFloorBindsEverybody(): void
    {
        $plan = [['filter' => 'L', 'exposure' => 300, 'count' => 1]];

        [, $errors] = $this->validate($this->pro($plan, ['minAltitude' => 14.9]));
        $this->assertArrayHasKey('minAltitude', $errors);

        [, $errors] = $this->validate($this->pro($plan, ['minAltitude' => 10]), true);
        $this->assertArrayHasKey('minAltitude', $errors);

        [$data, $errors] = $this->validate($this->pro($plan, ['minAltitude' => 15]));
        $this->assertSame([], $errors);
        $this->assertSame(15.0, $data['min_altitude']);

        [, $errors] = $this->validate($this->pro($plan, ['minAltitude' => 81]));
        $this->assertArrayHasKey('minAltitude', $errors);
    }

    public function testValidUntil(): void
    {
        $plan = [['filter' => 'L', 'exposure' => 300, 'count' => 1]];

        try {
            // 03:00 local on the 11th: still the night of the 10th — "valid until the 10th" holds
            Time::setTestNow('2026-11-10 22:00:00', 'UTC');

            foreach (['2026-11-10', '2026-11-11'] as $value) {
                [, $errors] = $this->validate($this->pro($plan, ['validUntil' => $value]));
                $this->assertSame([], $errors, $value);
            }

            foreach (['2026-11-09', '2026-02-30', '05.11.2026', 20261105] as $value) {
                [, $errors] = $this->validate($this->pro($plan, ['validUntil' => $value]));
                $this->assertArrayHasKey('validUntil', $errors, (string) $value);
            }

            // 13:00 local on the 11th: the night of the 10th is over
            Time::setTestNow('2026-11-11 08:00:00', 'UTC');
            [, $errors] = $this->validate($this->pro($plan, ['validUntil' => '2026-11-10']));
            $this->assertArrayHasKey('validUntil', $errors);
        } finally {
            Time::setTestNow();
        }
    }

    public function testMoonSeparation(): void
    {
        $plan = [['filter' => 'L', 'exposure' => 300, 'count' => 1]];

        [$data] = $this->validate($this->pro($plan, ['minMoonSeparation' => 40]));
        $this->assertSame(40, $data['min_moon_separation']);

        [, $errors] = $this->validate($this->pro($plan, ['minMoonSeparation' => 181]));
        $this->assertArrayHasKey('minMoonSeparation', $errors);
    }
}
