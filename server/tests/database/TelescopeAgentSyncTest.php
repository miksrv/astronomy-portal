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
 * The agent sync (FEAT-30 §4.3) against real tables: seq idempotency, gaps, transitions that
 * don't fit, absolute progress, expiry, the patrol visits and the night plan.
 *
 * @internal
 */
final class TelescopeAgentSyncTest extends CIUnitTestCase
{
    use TelescopeTables;

    private TelescopeJobsModel $jobs;
    private TelescopeAgentSync $sync;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createTelescopeTables();
        Database::connect()->table('users')->insert(['id' => 'u1', 'name' => 'Иван Петров', 'email' => 'ivan@example.com']);
        $this->jobs = new TelescopeJobsModel();
        $this->sync = new TelescopeAgentSync();
    }

    private function job(string $status = Telescope::STATUS_APPROVED, ?string $validUntil = null): string
    {
        $id = $this->jobs->createJob([
            'target_name'  => 'M 101',
            'ra'           => 210.80225,
            'dec'          => 54.34894,
            'mode'         => 'pro',
            'plan'         => json_encode([['filter' => 'L', 'exposure' => 300, 'count' => 3], ['filter' => 'H', 'exposure' => 600, 'count' => 2]]),
            'min_altitude' => 30,
            'valid_until'  => $validUntil,
        ], 'u1', false);

        Database::connect()->table('telescope_jobs')->where('id', $id)->update(['status' => $status]);

        return $id;
    }

    private function update(string $jobId, int $seq, string $type, array $payload = [], string $time = '2026-11-05T19:00:00Z'): array
    {
        return ['jobId' => $jobId, 'seq' => $seq, 'type' => $type, 'time' => $time] + ($payload ? ['payload' => $payload] : []);
    }

    private function results(array $updates): array
    {
        return array_column($this->sync->applyUpdates($updates)['results'], 'result');
    }

    public function testDesiredStateListsOnlyWhatTheObservatoryShouldKnow(): void
    {
        $ids = [];

        foreach ([...Telescope::ACTIVE_STATUSES, ...Telescope::FINAL_STATUSES] as $status) {
            $ids[$status] = $this->job($status);
        }

        $state = $this->sync->desiredState();
        $this->assertSame(
            [$ids['approved'], $ids['queued'], $ids['running']],
            array_column($state, 'id'),
        );

        $job = $state[0];
        $this->assertSame(1, $job['version']);
        $this->assertSame(0, $job['lastSeq']);
        $this->assertFalse($job['cancelRequested']);
        $this->assertSame([['filter' => 'L', 'exposure' => 300, 'count' => 3], ['filter' => 'H', 'exposure' => 600, 'count' => 2]], $job['plan']);
        $this->assertSame(30.0, $job['minAltitude']);
        $this->assertNull($job['lastFrameAt']);

        $this->jobs->builder()->where('id', $ids['running'])->update(['last_frame_at' => '2026-11-05 19:41:00']);
        $this->assertSame('2026-11-05T19:41:00Z', $this->sync->desiredState()[2]['lastFrameAt']);
    }

    public function testAFullNightAndCompletion(): void
    {
        $id = $this->job();

        $this->assertSame(['applied', 'applied', 'applied', 'applied', 'applied'], $this->results([
            $this->update($id, 1, 'accepted'),
            $this->update($id, 2, 'started', [], '2026-11-05T19:30:00Z'),
            $this->update($id, 3, 'progress', ['progress' => ['L' => 1], 'frameTime' => '2026-11-05T19:35:00Z']),
            $this->update($id, 4, 'progress', ['progress' => ['L' => 3, 'H' => 1], 'frameTime' => '2026-11-05T21:10:00Z']),
            $this->update($id, 5, 'night_ended', ['reason' => 'dawn'], '2026-11-06T01:00:00Z'),
        ]));

        $row = $this->jobs->find($id);
        $this->assertSame(Telescope::STATUS_QUEUED, $row['status']);
        $this->assertSame(['L' => 3, 'H' => 1], json_decode($row['progress'], true));
        $this->assertSame('2026-11-05 19:35:00', $row['first_frame_at']);
        $this->assertSame('2026-11-05 21:10:00', $row['last_frame_at']);
        $this->assertSame('2026-11-05 19:30:00', $row['started_at']);
        $this->assertSame(5, (int) $row['last_seq']);
        // The agent's changes are not portal-owned: the version stays
        $this->assertSame(1, (int) $row['version']);

        // Second night: started again keeps the first start time
        $this->assertSame(['applied', 'applied', 'applied'], $this->results([
            $this->update($id, 6, 'started', [], '2026-11-08T18:00:00Z'),
            $this->update($id, 7, 'progress', ['progress' => ['L' => 3, 'H' => 2], 'frameTime' => '2026-11-08T18:40:00Z']),
            $this->update($id, 8, 'completed', [], '2026-11-08T18:41:00Z'),
        ]));

        $row = $this->jobs->find($id);
        $this->assertSame(Telescope::STATUS_COMPLETED, $row['status']);
        $this->assertSame('2026-11-05 19:30:00', $row['started_at']);
        $this->assertSame('2026-11-08 18:41:00', $row['finished_at']);
        $this->assertSame('2026-11-08 18:40:00', $row['last_frame_at']);

        $this->assertCount(8, Database::connect()->table('telescope_job_updates')->where('job_id', $id)->get()->getResultArray());
    }

    public function testRepeatedBatchIsIdempotent(): void
    {
        $id    = $this->job();
        $batch = [
            $this->update($id, 1, 'accepted'),
            $this->update($id, 2, 'progress', ['progress' => ['L' => 2], 'frameTime' => '2026-11-05T19:35:00Z']),
        ];

        $this->assertSame(['applied', 'applied'], $this->results($batch));
        // The answer was lost, the agent sends the same batch again
        $this->assertSame(['duplicate', 'duplicate'], $this->results($batch));

        $row = $this->jobs->find($id);
        $this->assertSame(['L' => 2], json_decode($row['progress'], true));
        $this->assertSame(2, (int) $row['last_seq']);
        $this->assertSame(2, Database::connect()->table('telescope_job_updates')->where('job_id', $id)->countAllResults());
    }

    public function testAGapStopsTheBatch(): void
    {
        $id    = $this->job();
        $other = $this->job();

        $result = $this->sync->applyUpdates([
            $this->update($id, 1, 'accepted'),
            $this->update($id, 3, 'started'),
            $this->update($other, 1, 'accepted'),
        ]);

        $this->assertTrue($result['stopped']);
        $this->assertSame(['applied', 'gap'], array_column($result['results'], 'result'));
        $this->assertSame(1, $result['results'][1]['lastSeq']);
        // Nothing after the gap was touched
        $this->assertSame(Telescope::STATUS_APPROVED, $this->jobs->find($other)['status']);
    }

    public function testACancelOfAnApprovedJobWaitsForTheAgent(): void
    {
        // The agent may have the job in its schedule already: the cancel is a request it confirms
        $id = $this->job();
        $this->assertSame('cancel_requested', $this->jobs->cancel($id));
        $this->assertSame(Telescope::STATUS_APPROVED, $this->jobs->find($id)['status']);
        $this->assertTrue($this->sync->desiredState()[0]['cancelRequested']);

        $this->assertSame(['applied', 'applied'], $this->results([
            $this->update($id, 1, 'accepted'),
            $this->update($id, 2, 'cancelled'),
        ]));
        $this->assertSame(Telescope::STATUS_CANCELLED, $this->jobs->find($id)['status']);
    }

    public function testATransitionThatDoesNotFitConsumesItsSeq(): void
    {
        // Expired on the site before the agent's "accepted" arrived
        $id = $this->job(Telescope::STATUS_EXPIRED);

        $this->assertSame(['ignored', 'applied'], $this->results([
            $this->update($id, 1, 'accepted'),
            $this->update($id, 2, 'progress', ['progress' => ['L' => 1], 'frameTime' => '2026-11-05T19:35:00Z']),
        ]));

        $row = $this->jobs->find($id);
        $this->assertSame(Telescope::STATUS_EXPIRED, $row['status']);
        $this->assertSame(2, (int) $row['last_seq']);
        // A late frame still counts
        $this->assertSame(['L' => 1], json_decode($row['progress'], true));

        $log = Database::connect()->table('telescope_job_updates')->where('job_id', $id)->orderBy('seq')->get()->getResultArray();
        $this->assertSame(['0', '1'], array_map('strval', array_column($log, 'applied')));
    }

    public function testFinalStatusesNeverChange(): void
    {
        foreach (Telescope::FINAL_STATUSES as $status) {
            $id = $this->job($status);

            $this->assertSame(['ignored', 'ignored', 'ignored', 'ignored', 'ignored'], $this->results([
                $this->update($id, 1, 'accepted'),
                $this->update($id, 2, 'started'),
                $this->update($id, 3, 'completed'),
                $this->update($id, 4, 'failed', ['reason' => 'x']),
                $this->update($id, 5, 'cancelled'),
            ]), $status);
            $this->assertSame($status, $this->jobs->find($id)['status']);
        }
    }

    public function testCancelledOnlyAfterARequest(): void
    {
        $id = $this->job(Telescope::STATUS_RUNNING);

        $this->assertSame(['ignored'], $this->results([$this->update($id, 1, 'cancelled')]));
        $this->assertSame(Telescope::STATUS_RUNNING, $this->jobs->find($id)['status']);

        $this->jobs->cancel($id);
        $this->assertSame(['applied'], $this->results([$this->update($id, 2, 'cancelled')]));
        $this->assertSame(Telescope::STATUS_CANCELLED, $this->jobs->find($id)['status']);
    }

    public function testACancelOfAnApprovedJobIsConfirmedWithoutAccepted(): void
    {
        // The job never became "queued" on the site: the cancel must still end it
        $id = $this->job();
        $this->jobs->cancel($id);

        $this->assertSame(['applied'], $this->results([$this->update($id, 1, 'cancelled')]));
        $this->assertSame(Telescope::STATUS_CANCELLED, $this->jobs->find($id)['status']);
    }

    public function testAFinalJobIsNotCancelRequested(): void
    {
        // A cancel asked for while the agent was finishing the job
        $id = $this->job(Telescope::STATUS_RUNNING);
        $this->jobs->cancel($id);
        $this->results([$this->update($id, 1, 'completed')]);

        $this->assertSame(Telescope::STATUS_COMPLETED, $this->jobs->find($id)['status']);
        $this->assertFalse($this->jobs->format($this->jobs->find($id))['cancelRequested']);
    }

    public function testFailedKeepsTheReason(): void
    {
        $id = $this->job(Telescope::STATUS_QUEUED);
        $this->results([$this->update($id, 1, 'failed', ['reason' => 'Target never rises above 30°'])]);

        $row = $this->jobs->find($id);
        $this->assertSame(Telescope::STATUS_FAILED, $row['status']);
        $this->assertSame('Target never rises above 30°', $row['status_reason']);
    }

    public function testAnAdminEditMeanwhileIsKept(): void
    {
        $id = $this->job(Telescope::STATUS_QUEUED);
        $this->jobs->edit($id, 1, ['priority' => 7, 'min_altitude' => 40]);

        $this->results([$this->update($id, 1, 'started')]);

        $row = $this->jobs->find($id);
        $this->assertSame(Telescope::STATUS_RUNNING, $row['status']);
        $this->assertSame(7, (int) $row['priority']);
        $this->assertSame(40.0, (float) $row['min_altitude']);
        $this->assertSame(2, (int) $row['version']);
    }

    public function testInvalidAndUnknownUpdates(): void
    {
        $id = $this->job();

        $this->assertSame(['invalid', 'invalid', 'invalid', 'invalid', 'invalid', 'unknown_job'], $this->results([
            'junk',
            ['jobId' => $id, 'seq' => '1', 'type' => 'accepted', 'time' => '2026-11-05T19:00:00Z'],
            ['jobId' => $id, 'seq' => 1, 'type' => 'teleport', 'time' => '2026-11-05T19:00:00Z'],
            ['jobId' => $id, 'seq' => 1, 'type' => 'accepted', 'time' => 'yesterday'],
            ['jobId' => $id, 'seq' => 0, 'type' => 'accepted', 'time' => '2026-11-05T19:00:00Z'],
            $this->update('nope', 1, 'accepted'),
        ]));
        $this->assertSame(0, (int) $this->jobs->find($id)['last_seq']);
    }

    public function testMalformedProgressIsIgnoredNotStored(): void
    {
        $id = $this->job(Telescope::STATUS_RUNNING);

        $this->assertSame(['ignored', 'ignored', 'ignored', 'applied'], $this->results([
            $this->update($id, 1, 'progress', ['progress' => ['L' => -1]]),
            $this->update($id, 2, 'progress', ['progress' => [3, 4]]),
            $this->update($id, 3, 'progress', ['progress' => ['L' => '3']]),
            $this->update($id, 4, 'progress', ['progress' => ['L' => 2], 'frameTime' => 'garbage']),
        ]));

        $row = $this->jobs->find($id);
        $this->assertSame(['L' => 2], json_decode($row['progress'], true));
        $this->assertNull($row['first_frame_at']);
    }

    public function testNotificationsFirstFramesOnceAndCompleted(): void
    {
        $id = $this->job(Telescope::STATUS_RUNNING);

        $this->sync->applyUpdates([
            $this->update($id, 1, 'progress', ['progress' => ['L' => 1], 'frameTime' => '2026-11-05T19:35:00Z']),
            $this->update($id, 2, 'progress', ['progress' => ['L' => 2], 'frameTime' => '2026-11-05T19:41:00Z']),
            $this->update($id, 3, 'completed'),
        ]);

        $this->assertSame(['first_frames', 'completed'], array_column($this->sync->notifications(), 'kind'));
    }

    protected function tearDown(): void
    {
        Time::setTestNow();
        parent::tearDown();
    }

    public function testExpireOverdue(): void
    {
        Time::setTestNow('2026-11-10 08:00:00', 'UTC'); // 13:00 local: the night of the 10th

        $yesterday = '2026-11-09';
        $today     = '2026-11-10';

        $pending  = $this->job(Telescope::STATUS_PENDING, $yesterday);
        $approved = $this->job(Telescope::STATUS_APPROVED, $yesterday);
        $queued   = $this->job(Telescope::STATUS_QUEUED, $yesterday);
        $running  = $this->job(Telescope::STATUS_RUNNING, $yesterday);
        $current  = $this->job(Telescope::STATUS_QUEUED, $today);
        $dateless = $this->job(Telescope::STATUS_QUEUED);

        $expired = $this->sync->expireOverdue();

        $this->assertEqualsCanonicalizing([$pending, $approved, $queued], array_column($expired, 'id'));
        $this->assertSame(Telescope::STATUS_EXPIRED, $this->jobs->find($queued)['status']);
        $this->assertSame(2, (int) $this->jobs->find($queued)['version']);
        $this->assertSame(Telescope::STATUS_RUNNING, $this->jobs->find($running)['status']);
        $this->assertSame(Telescope::STATUS_QUEUED, $this->jobs->find($current)['status']);
        $this->assertSame(Telescope::STATUS_QUEUED, $this->jobs->find($dateless)['status']);

        // Second call: nothing new
        $this->assertSame([], $this->sync->expireOverdue());
    }


    public function testValidUntilCoversItsWholeNight(): void
    {
        // 01:00 local on the 11th: still the night of the 10th
        Time::setTestNow('2026-11-10 20:00:00', 'UTC');
        $tonight = $this->job(Telescope::STATUS_QUEUED, '2026-11-10');
        $past    = $this->job(Telescope::STATUS_QUEUED, '2026-11-09');

        $this->assertSame([$past], array_column($this->sync->expireOverdue(), 'id'));
        $this->assertSame(Telescope::STATUS_QUEUED, $this->jobs->find($tonight)['status']);

        // 13:00 local on the 11th: the night of the 10th is over
        Time::setTestNow('2026-11-11 08:00:00', 'UTC');
        $this->assertSame([$tonight], array_column($this->sync->expireOverdue(), 'id'));
    }
    public function testPatrolVisitsAreCountedOnce(): void
    {
        $model  = new PatrolTargetsModel();
        $nights = new PatrolNights();
        $m51    = $model->insert(['name' => 'M 51', 'ra' => 202.47, 'dec' => 47.195]);
        $off    = $model->insert(['name' => 'NGC 1', 'ra' => 1.8, 'dec' => 27.7, 'enabled' => 0]);

        $this->assertSame(['M 51'], array_column($model->forAgent(), 'name'));

        $visits = [
            ['target' => (int) $m51, 'time' => '2026-11-05T20:00:00Z', 'frames' => 5],
            ['target' => (int) $m51, 'time' => '2026-11-06T20:10:00Z', 'frames' => 5],
            ['target' => 999, 'time' => '2026-11-05T20:00:00Z', 'frames' => 5],
            ['target' => (int) $m51, 'time' => 'tonight', 'frames' => 5],
        ];

        $this->assertSame(['recorded' => 2, 'updated' => 0, 'duplicates' => 0, 'invalid' => 2], $nights->record($visits));
        $this->assertSame(['recorded' => 0, 'updated' => 0, 'duplicates' => 2, 'invalid' => 2], $nights->record($visits));

        $row = $model->find($m51);
        $this->assertSame(2, (int) $row['visits']);
        $this->assertSame('2026-11-06 20:10:00', $row['last_visit_at']);
        $this->assertSame(0, (int) $model->find($off)['visits']);
    }

    public function testNightPlanIsReplaced(): void
    {
        $model = new ObservatoryNightPlansModel();
        $model->store('2026-11-05', ['jobs' => ['a']]);
        $model->store('2026-11-05', ['jobs' => ['b']]);

        $rows = Database::connect()->table('observatory_night_plans')->get()->getResultArray();
        $this->assertCount(1, $rows);
        $this->assertSame(['jobs' => ['b']], json_decode($rows[0]['plan'], true));
    }
}
