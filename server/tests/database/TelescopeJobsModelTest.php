<?php

use App\Models\TelescopeJobsModel;
use CodeIgniter\Test\CIUnitTestCase;
use Config\Database;
use Config\Telescope;
use Tests\Support\Database\TelescopeTables;

/**
 * The job lifecycle on the site's side (FEAT-30 §4.2): creation, the author's cancel (at once,
 * or requested from the agent), the admin's review and edits — each a conditional update, so
 * concurrent changes never overwrite each other.
 *
 * @internal
 */
final class TelescopeJobsModelTest extends CIUnitTestCase
{
    use TelescopeTables;

    private TelescopeJobsModel $model;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createTelescopeTables();
        Database::connect()->table('users')->insertBatch([
            ['id' => 'u1', 'name' => 'Иван Петров', 'email' => 'ivan@example.com', 'avatar' => 'a1'],
            ['id' => 'admin', 'name' => 'Admin', 'email' => 'admin@example.com', 'avatar' => null],
        ]);
        $this->model = new TelescopeJobsModel();
    }

    private function job(string $userId = 'u1', bool $approved = false): string
    {
        return $this->model->createJob([
            'target_name' => 'M 101',
            'object'      => null,
            'ra'          => 210.80225,
            'dec'         => 54.34894,
            'mode'        => 'simple',
            'preset'      => 'L',
            'plan'        => json_encode([['filter' => 'L', 'exposure' => 300, 'count' => 20]]),
            'min_altitude' => 30,
        ], $userId, $approved);
    }

    private function setStatus(string $id, string $status): void
    {
        Database::connect()->table('telescope_jobs')->where('id', $id)->update(['status' => $status]);
    }

    public function testCreatePendingAndApproved(): void
    {
        $pending = $this->model->find($this->job());
        $this->assertSame(Telescope::STATUS_PENDING, $pending['status']);
        $this->assertSame(1, (int) $pending['version']);
        $this->assertNull($pending['reviewed_by']);
        $this->assertNotEmpty($pending['id']);

        $approved = $this->model->find($this->job('admin', true));
        $this->assertSame(Telescope::STATUS_APPROVED, $approved['status']);
        $this->assertSame('admin', $approved['reviewed_by']);
        $this->assertNotNull($approved['reviewed_at']);
    }

    public function testCountActive(): void
    {
        $a = $this->job();
        $b = $this->job();
        $c = $this->job();
        $this->job('admin');
        $this->setStatus($b, Telescope::STATUS_RUNNING);
        $this->setStatus($c, Telescope::STATUS_COMPLETED);

        $this->assertSame(2, $this->model->countActive('u1'));
        $this->assertSame(1, $this->model->countActive('admin'));
        $this->assertNotEmpty($a);
    }

    public function testCancelBeforeTheObservatoryHasIt(): void
    {
        $id = $this->job();

        $this->assertSame(Telescope::STATUS_CANCELLED, $this->model->cancel($id));
        $row = $this->model->find($id);
        $this->assertSame(Telescope::STATUS_CANCELLED, $row['status']);
        $this->assertNotNull($row['finished_at']);
        $this->assertSame(2, (int) $row['version']);
    }

    public function testCancelOfAJobTheObservatoryMayHaveIsRequested(): void
    {
        // Approved too: the agent pulls it at once and may have loaded it before "accepted" arrived
        foreach ([Telescope::STATUS_APPROVED, Telescope::STATUS_QUEUED, Telescope::STATUS_RUNNING] as $status) {
            $id = $this->job();
            $this->setStatus($id, $status);

            $this->assertSame('cancel_requested', $this->model->cancel($id));
            $row = $this->model->find($id);
            $this->assertSame($status, $row['status']);
            $this->assertNotNull($row['cancel_requested_at']);
            $this->assertSame(2, (int) $row['version']);

            // Asking again changes nothing
            $this->assertSame('cancel_requested', $this->model->cancel($id));
            $this->assertSame(2, (int) $this->model->find($id)['version']);
        }
    }

    public function testFinalJobsCannotBeCancelled(): void
    {
        foreach (Telescope::FINAL_STATUSES as $status) {
            $id = $this->job();
            $this->setStatus($id, $status);

            $this->assertNull($this->model->cancel($id), $status);
            $this->assertSame($status, $this->model->find($id)['status']);
        }
    }

    public function testReview(): void
    {
        $id = $this->job();
        $this->assertTrue($this->model->review($id, true, 'admin'));
        $row = $this->model->find($id);
        $this->assertSame(Telescope::STATUS_APPROVED, $row['status']);
        $this->assertSame('admin', $row['reviewed_by']);
        $this->assertNull($row['finished_at']);

        // Only from pending: a second review (another admin, a double click) is refused
        $this->assertFalse($this->model->review($id, false, 'admin', 'late'));
        $this->assertSame(Telescope::STATUS_APPROVED, $this->model->find($id)['status']);

        $rejected = $this->job();
        $this->assertTrue($this->model->review($rejected, false, 'admin', 'Target too low'));
        $row = $this->model->find($rejected);
        $this->assertSame(Telescope::STATUS_REJECTED, $row['status']);
        $this->assertSame('Target too low', $row['status_reason']);
        $this->assertNotNull($row['finished_at']);
    }

    public function testCancelledJobCannotBeApproved(): void
    {
        $id = $this->job();
        $this->model->cancel($id);
        $this->assertFalse($this->model->review($id, true, 'admin'));
        $this->assertSame(Telescope::STATUS_CANCELLED, $this->model->find($id)['status']);
    }

    public function testEditBumpsTheVersion(): void
    {
        $id = $this->job();
        $this->assertNull($this->model->edit($id, 1, ['priority' => 5, 'pinned' => 1, 'min_altitude' => 40]));

        $row = $this->model->find($id);
        $this->assertSame(5, (int) $row['priority']);
        $this->assertSame(1, (int) $row['pinned']);
        $this->assertSame(40.0, (float) $row['min_altitude']);
        $this->assertSame(2, (int) $row['version']);
    }

    public function testEditOfAStaleVersionIsRefused(): void
    {
        $id = $this->job();
        $this->model->edit($id, 1, ['priority' => 5]);

        $this->assertSame('changed', $this->model->edit($id, 1, ['priority' => 7]));
        $this->assertSame(5, (int) $this->model->find($id)['priority']);
    }

    public function testEditIgnoresAgentOwnedFields(): void
    {
        $id = $this->job();
        $this->model->edit($id, 1, ['priority' => 1, 'status' => Telescope::STATUS_COMPLETED, 'progress' => '{"L":20}', 'last_seq' => 99]);

        $row = $this->model->find($id);
        $this->assertSame(Telescope::STATUS_PENDING, $row['status']);
        $this->assertNull($row['progress']);
        $this->assertSame(0, (int) $row['last_seq']);
    }

    public function testPauseOnlyApprovedOrQueuedJobs(): void
    {
        $pending = $this->job();
        $this->assertSame('not_pausable', $this->model->edit($pending, 1, ['held' => 1]));

        $approved = $this->job('admin', true);
        $this->assertNull($this->model->edit($approved, 1, ['held' => 1]));
        $this->assertSame(1, (int) $this->model->find($approved)['held']);

        // A paused job that the agent started meanwhile can still be resumed
        $this->setStatus($approved, Telescope::STATUS_RUNNING);
        $this->assertNull($this->model->edit($approved, 2, ['held' => 0]));
        $this->assertSame(0, (int) $this->model->find($approved)['held']);
    }

    public function testPlanOfARunningOrCancellingJobIsLocked(): void
    {
        $running = $this->job();
        $this->setStatus($running, Telescope::STATUS_RUNNING);
        $this->assertSame('running', $this->model->edit($running, 1, ['min_altitude' => 40]));
        // Scheduling fields are fine — but not a pause: the job would go on to the end of the night
        $this->assertNull($this->model->edit($running, 1, ['priority' => 3]));
        $this->assertSame('not_pausable', $this->model->edit($running, 2, ['held' => 1]));

        $queued = $this->job();
        $this->setStatus($queued, Telescope::STATUS_QUEUED);
        $this->model->cancel($queued);
        $this->assertSame('running', $this->model->edit($queued, 2, ['target_name' => 'M 51']));

        $final = $this->job();
        $this->setStatus($final, Telescope::STATUS_COMPLETED);
        $this->assertSame('final', $this->model->edit($final, 1, ['priority' => 1]));

        $this->assertSame('not_found', $this->model->edit('nope', 1, ['priority' => 1]));
    }

    public function testListAndFormat(): void
    {
        $mine = $this->job();
        $this->job('admin', true);

        $own = $this->model->listJobs(['userId' => 'u1']);
        $this->assertCount(1, $own);

        $job = TelescopeJobsModel::format($own[0]);
        $this->assertSame($mine, $job['id']);
        $this->assertSame(['id' => 'u1', 'name' => 'Иван Петров', 'avatar' => 'a1'], $job['author']);
        $this->assertSame([['filter' => 'L', 'exposure' => 300, 'count' => 20]], $job['plan']);
        $this->assertSame(210.80225, $job['ra']);
        $this->assertFalse($job['cancelRequested']);
        $this->assertArrayNotHasKey('version', $job);
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $job['createdAt']);

        $manager = TelescopeJobsModel::format($own[0], true);
        $this->assertSame(1, $manager['version']);
        $this->assertSame('u1', $manager['author']['id']);

        $this->assertCount(2, $this->model->listJobs());
        $this->assertCount(1, $this->model->listJobs(['status' => [Telescope::STATUS_APPROVED]]));
    }

    public function testPatrolJobHasNoAuthor(): void
    {
        $id = $this->job();
        Database::connect()->table('telescope_jobs')->where('id', $id)->update(['source' => Telescope::SOURCE_PATROL, 'user_id' => null]);

        $job = TelescopeJobsModel::format($this->model->findWithAuthor($id), false, 'u1');
        $this->assertSame(Telescope::SOURCE_PATROL, $job['source']);
        $this->assertNull($job['author']);
        $this->assertFalse($job['own']);

        $this->assertSame(Telescope::SOURCE_SITE, TelescopeJobsModel::format($this->model->findWithAuthor($this->job()))['source']);
    }

    public function testQueueOrder(): void
    {
        $db  = Database::connect()->table('telescope_jobs');
        $ids = [];

        foreach ([
            'pending'  => ['status' => 'pending', 'created_at' => '2026-11-01 10:00:00'],
            'old'      => ['status' => 'approved', 'created_at' => '2026-11-02 10:00:00'],
            'new'      => ['status' => 'queued', 'created_at' => '2026-11-03 10:00:00'],
            'priority' => ['status' => 'queued', 'created_at' => '2026-11-04 10:00:00', 'priority' => 5],
            'pinned'   => ['status' => 'approved', 'created_at' => '2026-11-05 10:00:00', 'pinned' => 1],
            'held'     => ['status' => 'queued', 'created_at' => '2026-10-01 10:00:00', 'held' => 1, 'pinned' => 1],
            'running'  => ['status' => 'running', 'created_at' => '2026-11-06 10:00:00'],
            'patrol'   => ['status' => 'queued', 'created_at' => '2026-10-01 09:00:00', 'source' => 'patrol', 'user_id' => null],
            'done'     => ['status' => 'completed', 'created_at' => '2026-10-02 10:00:00', 'finished_at' => '2026-10-20 10:00:00'],
            'done2'    => ['status' => 'expired', 'created_at' => '2026-09-01 10:00:00', 'finished_at' => '2026-10-25 10:00:00'],
        ] as $key => $fields) {
            $ids[$key] = $this->job();
            $db->where('id', $ids[$key])->update($fields);
        }

        $order = array_column($this->model->listJobs(['sort' => 'queue']), 'id');
        $this->assertSame(
            [$ids['running'], $ids['pinned'], $ids['priority'], $ids['old'], $ids['new'], $ids['patrol'], $ids['held'], $ids['pending'], $ids['done2'], $ids['done']],
            $order,
        );
    }

    public function testRemoveOnlyWhatTheObservatoryDoesNotHave(): void
    {
        $removable = [Telescope::STATUS_PENDING, ...Telescope::FINAL_STATUSES];

        foreach ([...$removable, Telescope::STATUS_APPROVED, Telescope::STATUS_QUEUED, Telescope::STATUS_RUNNING] as $status) {
            $id = $this->job();
            $this->setStatus($id, $status);
            Database::connect()->table('telescope_job_updates')->insert([
                'job_id' => $id, 'seq' => 1, 'type' => 'accepted', 'applied' => 1, 'time' => '2026-11-05 20:00:00', 'created_at' => '2026-11-05 20:00:00',
            ]);

            $this->assertSame(in_array($status, $removable, true), $this->model->remove($id), $status);
            $left = Database::connect()->table('telescope_job_updates')->where('job_id', $id)->countAllResults();
            $this->assertSame(in_array($status, $removable, true) ? 0 : 1, $left, "updates of a {$status} job");
        }

        $this->assertFalse($this->model->remove('nope'));
    }

    public function testFormatMarksOwnJobsAndHidesTheReasonFromOthers(): void
    {
        $id = $this->job();
        $this->model->review($id, false, 'admin', 'Too low for our horizon');
        $row = $this->model->findWithAuthor($id);

        $author = TelescopeJobsModel::format($row, false, 'u1');
        $this->assertTrue($author['own']);
        $this->assertSame('Too low for our horizon', $author['statusReason']);

        $guest = TelescopeJobsModel::format($row);
        $this->assertFalse($guest['own']);
        $this->assertNull($guest['statusReason']);
        $this->assertArrayNotHasKey('version', $guest);
        $this->assertSame('Иван Петров', $guest['author']['name']);
        $this->assertSame('u1', $guest['author']['id']); // for the avatar URL, as comments do

        $manager = TelescopeJobsModel::format($row, true, 'admin');
        $this->assertFalse($manager['own']);
        $this->assertSame('Too low for our horizon', $manager['statusReason']);
        $this->assertSame('u1', $manager['author']['id']);
    }

    public function testCountJobs(): void
    {
        $this->job();
        $b = $this->job();
        $this->job('admin');
        $this->setStatus($b, Telescope::STATUS_REJECTED);

        $this->assertSame(3, $this->model->countJobs());
        $this->assertSame(2, $this->model->countJobs(['userId' => 'u1']));
        $this->assertSame(2, $this->model->countJobs(['status' => Telescope::PUBLIC_STATUSES]));
    }
}
