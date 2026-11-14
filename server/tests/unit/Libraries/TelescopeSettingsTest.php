<?php

use App\Database\Migrations\AddTelescopeJobs;
use App\Libraries\TelescopeSettings;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class TelescopeSettingsTest extends CIUnitTestCase
{
    public function testDefaultsMatchTheMigration(): void
    {
        require_once APPPATH . 'Database/Migrations/2026-11-05-100000_AddTelescopeJobs.php';
        $this->assertSame(AddTelescopeJobs::SETTINGS, TelescopeSettings::DEFAULTS);
    }

    public function testDefaults(): void
    {
        $settings = new TelescopeSettings(TelescopeSettings::DEFAULTS);

        $this->assertFalse($settings->autonomousMode);
        $this->assertSame(15.0, $settings->altitudeFloor);
        $this->assertSame(30.0, $settings->defaultMinAltitude);
        $this->assertSame(7200, $settings->maxExposureSeconds);
        $this->assertSame(3, $settings->maxActiveJobs);
        $this->assertSame(30, $settings->exposureMin);
        $this->assertSame(600, $settings->exposureMax);
        $this->assertSame(100, $settings->maxFramesPerFilter);
        $this->assertSame(['L', 'R', 'G', 'B', 'H', 'O', 'S'], $settings->filters);
    }

    public function testEmptyTableFallsBackToDefaults(): void
    {
        $settings = new TelescopeSettings([]);

        $this->assertFalse($settings->autonomousMode);
        $this->assertSame(3, $settings->maxActiveJobs);
        $this->assertSame(['L', 'R', 'G', 'B', 'H', 'O', 'S'], $settings->filters);
    }

    public function testBrokenValuesNeverOpenALimit(): void
    {
        $settings = new TelescopeSettings([
            'job_max_active'         => 'many',
            'job_max_exposure_hours' => '-1',
            'job_exposure_max'       => '99999',
            'autonomous_mode'        => 'yes',
        ]);

        $this->assertSame(3, $settings->maxActiveJobs);
        $this->assertSame(7200, $settings->maxExposureSeconds);
        $this->assertSame(600, $settings->exposureMax);
        // Only an explicit "1" turns the autopilot on
        $this->assertFalse($settings->autonomousMode);
    }

    public function testAltitudeFloorNeverBelowFifteen(): void
    {
        $settings = new TelescopeSettings(['altitude_floor' => '5', 'job_default_min_altitude' => '10', 'patrol_min_altitude' => '0']);

        $this->assertSame(15.0, $settings->altitudeFloor);
        $this->assertSame(15.0, $settings->defaultMinAltitude);
        $this->assertSame(15.0, $settings->patrolMinAltitude);
    }

    public function testDefaultMinAltitudeFollowsARaisedFloor(): void
    {
        $settings = new TelescopeSettings(['altitude_floor' => '20', 'job_default_min_altitude' => '18']);

        $this->assertSame(20.0, $settings->altitudeFloor);
        $this->assertSame(20.0, $settings->defaultMinAltitude);
    }

    public function testFiltersFromTheSetting(): void
    {
        $settings = new TelescopeSettings(['filters' => ' L , R,G ,, B ']);
        $this->assertSame(['L', 'R', 'G', 'B'], $settings->filters);
    }
}
