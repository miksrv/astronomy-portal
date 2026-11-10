<?php

use App\Libraries\PatrolNights;
use App\Libraries\TelescopeAgentSync;
use App\Models\ObservatoryNightPlansModel;
use App\Models\PatrolTargetsModel;
use App\Models\TelescopeJobsModel;
use CodeIgniter\I18n\Time;
use CodeIgniter\Test\CIUnitTestCase;
use Config\Database;
use Config\Telescope;
use Tests\Support\Database\TelescopeTables;

/**
 * The patrol as jobs (FEAT-30 §4.10, decision of 2026-11-10): one job per night, made by the
 * night's first reported visit, following its visits and plan, closed after the dawn; never in
 * the agent's desired state, never changed from the site.
 *
 * Nights are local (UTC+5): the night of 2026-11-10 is 2026-11-10 07:00Z … 2026-11-11 07:00Z.
 *
 * @internal
 */
final class PatrolNightsTest extends CIUnitTestCase
{
    use TelescopeTables;

    private PatrolNights $nights;
    private TelescopeJobsModel $jobs;

    /** @var list<int> */
    private array $targets = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->createTelescopeTables();
        Time::setTestNow('2026-11-10 18:00:00', 'UTC'); // 23:00 local, the night of the 10th

        $model = new PatrolTargetsModel();

        foreach (['M 51', 'M 101', 'NGC 2903', 'NGC 4565'] as $i => $name) {
            $this->targets[] = (int) $model->insert(['name' => $name, 'ra' => 100 + $i, 'dec' => 40 + $i]);
        }

        $this->nights = new PatrolNights();
        $this->jobs   = new TelescopeJobsModel();
    }

    protected function tearDown(): void
    {
        Time::setTestNow();
        parent::tearDown();
    }

    private function visit(int $target, string $time, int $frames = 5, ?string $lastFrame = null): array
    {
        return ['target' => $this->targets[$target], 'time' => $time, 'frames' => $frames] + ($lastFrame ? ['lastFrame' => $lastFrame] : []);
    }

    /** @return list<array> the patrol jobs */
    private function patrolJobs(): array
    {
        return Database::connect()->table('telescope_jobs')->where('source', Telescope::SOURCE_PATROL)->orderBy('night')->get()->getResultArray();
    }

    private function plan(string $night, array $plannedTargets, ?string $dawn = null): void
    {
        (new ObservatoryNightPlansModel())->store($night, [
            'darkness' => ['nauticalEnd' => $dawn],
            'patrol'   => ['enabled' => true, 'planned' => array_map(fn (int $i) => ['id' => $this->targets[$i], 'name' => "t{$i}"], $plannedTargets)],
        ]);
    }

    public function testNoVisitsNoJob(): void
    {
        $this->plan('2026-11-10', [0, 1, 2]);

        $this->assertNull($this->nights->refreshNight('2026-11-10'));
        $this->assertSame([], $this->patrolJobs());
    }

    public function testTheFirstVisitMakesTheNightsJob(): void
    {
        $this->nights->record([$this->visit(0, '2026-11-10T16:00:00Z', 3, '2026-11-10T16:04:00Z')]);

        $jobs = $this->patrolJobs();
        $this->assertCount(1, $jobs);

        $job = $jobs[0];
        $this->assertSame('2026-11-10', $job['night']);
        $this->assertSame(Telescope::STATUS_RUNNING, $job['status']);
        $this->assertNull($job['user_id']);
        $this->assertNull($job['ra']);
        $this->assertSame(1, (int) $job['visits_done']);
        $this->assertSame(1, (int) $job['visits_planned']);
        $this->assertSame(['L' => 3], json_decode($job['progress'], true));
        $this->assertSame('2026-11-10 16:00:00', $job['first_frame_at']);
        $this->assertSame('2026-11-10 16:04:00', $job['last_frame_at']);
        $this->assertSame([['filter' => 'L', 'exposure' => 60, 'count' => 5]], json_decode($job['plan'], true));

        $visit = Database::connect()->table('patrol_visits')->get()->getRowArray();
        $this->assertSame($job['id'], $visit['job_id']);
    }

    public function testAVisitReportedWhileShotIsUpdatedNotDuplicated(): void
    {
        $this->nights->record([$this->visit(0, '2026-11-10T16:00:00Z', 2, '2026-11-10T16:02:00Z')]);

        $this->assertSame(
            ['recorded' => 0, 'updated' => 1, 'duplicates' => 0, 'invalid' => 0],
            $this->nights->record([$this->visit(0, '2026-11-10T16:00:00Z', 5, '2026-11-10T16:06:00Z')]),
        );
        // A late repeat of an older report changes nothing
        $this->assertSame(
            ['recorded' => 0, 'updated' => 0, 'duplicates' => 1, 'invalid' => 0],
            $this->nights->record([$this->visit(0, '2026-11-10T16:00:00Z', 2, '2026-11-10T16:02:00Z')]),
        );

        $job = $this->patrolJobs()[0];
        $this->assertSame(1, (int) $job['visits_done']);
        $this->assertSame(['L' => 5], json_decode($job['progress'], true));
        $this->assertSame('2026-11-10 16:06:00', $job['last_frame_at']);
    }

    public function testOneJobPerNight(): void
    {
        $this->nights->record([
            $this->visit(0, '2026-11-09T18:00:00Z'), // the night of the 9th
            $this->visit(1, '2026-11-10T16:00:00Z'),
            $this->visit(2, '2026-11-10T16:15:00Z'),
            $this->visit(3, '2026-11-11T01:00:00Z'), // still the night of the 10th (06:00 local)
        ]);

        $jobs = $this->patrolJobs();
        $this->assertSame(['2026-11-09', '2026-11-10'], array_column($jobs, 'night'));
        $this->assertSame([1, 3], array_map('intval', array_column($jobs, 'visits_done')));
        $this->assertSame(['L' => 15], json_decode($jobs[1]['progress'], true));
        // The night of the 9th is over (it is the 10th's night now): reported late, final at once
        $this->assertSame(Telescope::STATUS_COMPLETED, $jobs[0]['status']);
        $this->assertSame('2026-11-09 18:00:00', $jobs[0]['finished_at']);
        $this->assertSame(Telescope::STATUS_RUNNING, $jobs[1]['status']);
    }

    public function testPlannedFollowsThePlanAndNeverShrinks(): void
    {
        $this->plan('2026-11-10', [0, 1, 2]);
        $this->nights->record([$this->visit(0, '2026-11-10T16:00:00Z')]);
        $this->assertSame(3, (int) $this->patrolJobs()[0]['visits_planned']);

        // The agent's next plan leaves out what was shot and adds one more
        $this->plan('2026-11-10', [1, 2, 3]);
        $this->nights->refreshNight('2026-11-10');
        $this->assertSame(4, (int) $this->patrolJobs()[0]['visits_planned']);

        // A replan with fewer targets (clouds, a site job took the time) keeps the count
        $this->plan('2026-11-10', [1]);
        $this->nights->refreshNight('2026-11-10');
        $this->assertSame(4, (int) $this->patrolJobs()[0]['visits_planned']);
    }

    public function testClosedAfterTheDawnOfItsNight(): void
    {
        $this->plan('2026-11-10', [0], '2026-11-11T01:30:00Z');
        $this->nights->record([$this->visit(0, '2026-11-10T16:00:00Z', 5, '2026-11-10T16:06:00Z')]);

        $this->assertSame(0, $this->nights->closeFinished());

        Time::setTestNow('2026-11-11 01:31:00', 'UTC');
        $this->assertSame(1, $this->nights->closeFinished());

        $job = $this->patrolJobs()[0];
        $this->assertSame(Telescope::STATUS_COMPLETED, $job['status']);
        $this->assertSame('2026-11-10 16:06:00', $job['finished_at']);
    }

    public function testClosedOnTheNextNightWithoutAPlan(): void
    {
        $this->nights->record([$this->visit(0, '2026-11-10T16:00:00Z')]);

        Time::setTestNow('2026-11-11 06:59:00', 'UTC'); // 11:59 local: still the night of the 10th
        $this->assertSame(0, $this->nights->closeFinished());

        Time::setTestNow('2026-11-11 07:00:00', 'UTC');
        $this->assertSame(1, $this->nights->closeFinished());
    }

    public function testInvalidVisits(): void
    {
        $result = $this->nights->record([
            ['target' => $this->targets[0], 'time' => '2026-11-10T16:00:00Z', 'frames' => 0],
            ['target' => $this->targets[0], 'time' => '2026-11-10T16:00:00Z', 'frames' => 5, 'lastFrame' => 'later'],
            ['target' => $this->targets[0], 'time' => '2026-11-20T16:00:00Z', 'frames' => 5], // a wrong clock
            ['target' => '1', 'time' => '2026-11-10T16:00:00Z', 'frames' => 5],
            'junk',
        ]);

        $this->assertSame(['recorded' => 0, 'updated' => 0, 'duplicates' => 0, 'invalid' => 5], $result);
        $this->assertSame([], $this->patrolJobs());
    }

    public function testTheAgentNeverGetsOrUpdatesAPatrolNight(): void
    {
        $this->nights->record([$this->visit(0, '2026-11-10T16:00:00Z')]);
        $id   = $this->patrolJobs()[0]['id'];
        $sync = new TelescopeAgentSync();

        $this->assertSame([], $sync->desiredState());
        $this->assertSame([], $sync->expireOverdue());

        $result = $sync->applyUpdates([['jobId' => $id, 'seq' => 1, 'type' => 'completed', 'time' => '2026-11-10T17:00:00Z']]);
        $this->assertSame('unknown_job', $result['results'][0]['result']);
        $this->assertSame(Telescope::STATUS_RUNNING, $this->jobs->find($id)['status']);
    }

    public function testFormatAndVisitsOfTheJob(): void
    {
        $this->plan('2026-11-10', [0, 1, 2]);
        $this->nights->record([
            $this->visit(1, '2026-11-10T16:20:00Z', 5),
            $this->visit(0, '2026-11-10T16:00:00Z', 4, '2026-11-10T16:05:00Z'),
        ]);
        $id = $this->patrolJobs()[0]['id'];

        $job = TelescopeJobsModel::format($this->jobs->findWithAuthor($id));
        $this->assertSame(Telescope::SOURCE_PATROL, $job['source']);
        $this->assertNull($job['author']);
        $this->assertNull($job['ra']);
        $this->assertSame(['night' => '2026-11-10', 'visitsDone' => 2, 'visitsPlanned' => 3], $job['patrol']);
        $this->assertSame(['L' => 9], $job['progress']);

        // M 51 is in the catalog, M 101 was deleted from it
        Database::connect()->table('objects')->insertBatch([
            ['catalog_name' => 'M_51', 'deleted_at' => null],
            ['catalog_name' => 'M_101', 'deleted_at' => '2026-01-01 00:00:00'],
        ]);

        $visits = $this->nights->visitsOf($id);
        $this->assertSame(['M 51', 'M 101'], array_map(static fn ($v) => $v['target']['name'], $visits));
        $this->assertSame(['M_51', null], array_map(static fn ($v) => $v['target']['object'], $visits));
        $this->assertSame('2026-11-10T16:05:00Z', $visits[0]['lastFrame']);
        $this->assertSame(4, $visits[0]['frames']);

        // A site job has no patrol block
        $this->assertNull(TelescopeJobsModel::format([
            'id' => 'x', 'source' => 'site', 'user_id' => null, 'target_name' => 'M 1', 'object' => null, 'ra' => 1, 'dec' => 2,
            'mode' => 'simple', 'preset' => 'L', 'plan' => '[]', 'min_altitude' => 30, 'min_moon_separation' => null,
            'valid_until' => null, 'priority' => 0, 'pinned' => 0, 'held' => 0, 'status' => 'queued', 'status_reason' => null,
            'cancel_requested_at' => null, 'progress' => null, 'created_at' => null, 'reviewed_at' => null, 'accepted_at' => null,
            'started_at' => null, 'first_frame_at' => null, 'last_frame_at' => null, 'finished_at' => null,
        ])['patrol']);
    }
}
