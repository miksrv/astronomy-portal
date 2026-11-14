<?php

use App\Models\ObservatoryNightPlansModel;
use App\Models\TelescopeJobsModel;
use CodeIgniter\I18n\Time;
use CodeIgniter\Test\CIUnitTestCase;
use Config\Database;
use Tests\Support\Database\TelescopeTables;

/**
 * Tonight's plan on the site: everyone sees the planned jobs (target + "FirstName L.") and the
 * patrol, never the agent's scores, reasons, warnings or the Ekos state.
 *
 * @internal
 */
final class ObservatoryNightPlansTest extends CIUnitTestCase
{
    use TelescopeTables;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createTelescopeTables();
        Database::connect()->table('users')->insert(['id' => 'u1', 'name' => 'Иван Петров', 'email' => 'ivan@example.com', 'avatar' => 'a1']);
    }

    private function job(string $status): string
    {
        $model = new TelescopeJobsModel();
        $id    = $model->createJob([
            'target_name'  => 'M 101',
            'object'       => 'M_101',
            'ra'           => 210.80225,
            'dec'          => 54.34894,
            'mode'         => 'simple',
            'preset'       => 'L',
            'plan'         => json_encode([['filter' => 'L', 'exposure' => 300, 'count' => 20]]),
            'min_altitude' => 30,
        ], 'u1', true);
        Database::connect()->table('telescope_jobs')->where('id', $id)->update(['status' => $status]);

        return $id;
    }

    public function testCurrentNightRunsFromLocalNoonToNoon(): void
    {
        // Asia/Yekaterinburg is UTC+5
        $this->assertSame('2026-11-05', ObservatoryNightPlansModel::currentNight(Time::parse('2026-11-05 07:00:00', 'UTC')));
        $this->assertSame('2026-11-05', ObservatoryNightPlansModel::currentNight(Time::parse('2026-11-06 06:59:00', 'UTC')));
        $this->assertSame('2026-11-04', ObservatoryNightPlansModel::currentNight(Time::parse('2026-11-05 06:59:00', 'UTC')));
    }

    public function testPublicViewShowsOnlyWhatEveryoneMaySee(): void
    {
        $queued    = $this->job('queued');
        $cancelled = $this->job('cancelled');
        $model     = new ObservatoryNightPlansModel();
        $plan      = [
            'night'    => '2026-11-05',
            'builtAt'  => '2026-11-05T12:00:00Z',
            'darkness' => ['nauticalStart' => '2026-11-05T13:44:00Z', 'nauticalEnd' => '2026-11-06T01:44:00Z', 'astroStart' => null, 'astroEnd' => null],
            'moon'     => ['illumination' => 0.14],
            'jobs'     => [
                ['id' => $queued, 'planned' => true, 'score' => 51.2, 'groups' => ['bb', 'nb'], 'reasons' => []],
                ['id' => $cancelled, 'planned' => true, 'groups' => ['bb']],
                ['id' => 'other', 'planned' => false, 'reasons' => ['held by an admin']],
            ],
            'patrol'   => ['enabled' => true, 'candidates' => 40, 'planned' => [['id' => 3, 'name' => 'NGC 2903', 'score' => 12.0]]],
            'warnings' => ['focuser not connected: the Focus step will fail'],
            'ekos'     => ['loaded' => false, 'reason' => 'loading into Ekos is off'],
        ];
        $model->store('2026-11-05', $plan);

        $view = $model->publicView('2026-11-05', $model->plan('2026-11-05'));

        $this->assertSame('2026-11-05T12:00:00Z', $view['builtAt']);
        $this->assertSame(0.14, $view['moon']['illumination']);
        $this->assertSame('2026-11-05T13:44:00Z', $view['darkness']['nauticalStart']);
        $this->assertCount(1, $view['jobs']); // the cancelled one is not public
        $this->assertSame(['id' => $queued, 'targetName' => 'M 101', 'object' => 'M_101', 'groups' => ['bb', 'nb'], 'author' => ['id' => 'u1', 'name' => 'Иван Петров', 'avatar' => 'a1']], $view['jobs'][0]);
        $this->assertSame(['enabled' => true, 'targets' => ['NGC 2903']], $view['patrol']);
        $json = json_encode($view);
        foreach (['score', 'reasons', 'warnings', 'ekos', 'candidates', 'focuser'] as $private) {
            $this->assertStringNotContainsString($private, $json);
        }
    }

    public function testNoPlanYet(): void
    {
        $this->assertNull((new ObservatoryNightPlansModel())->plan('2026-11-05'));
    }
}
