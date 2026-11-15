<?php

use App\Enums\Permission;
use App\Models\TelescopeJobsModel;
use CodeIgniter\I18n\Time;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;
use Config\Database;
use Config\Telescope;
use Tests\Support\Database\TelescopeTables;

/**
 * `POST /telescope/jobs/:id/repeat` end to end: the same job back into the queue, shot again from
 * scratch — who may, from which statuses, what is reset, the author's limit.
 *
 * @internal
 */
final class TelescopeRepeatTest extends CIUnitTestCase
{
    use FeatureTestTrait;
    use TelescopeTables;

    private TelescopeJobsModel $jobs;

    private ?string $secret = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createTelescopeTables();

        helper('auth');
        $this->secret = getenv('auth.token.secret') ?: null;
        putenv('auth.token.secret=' . str_repeat('k', 40));
        putenv('auth.token.live=3600');

        $db = Database::connect();
        // The user row the session reads (the real table has MySQL ENUMs), and the roles
        $db->query('DROP TABLE IF EXISTS "users"');
        $db->query('DROP TABLE IF EXISTS "user_roles"');
        $db->query('CREATE TABLE users (id VARCHAR(15) PRIMARY KEY, name VARCHAR(100), email VARCHAR(100), phone VARCHAR(20), avatar VARCHAR(40), auth_type VARCHAR(20), roles TEXT, locale VARCHAR(2) DEFAULT \'ru\', settings TEXT, sex VARCHAR(10), birthday DATE, service_id VARCHAR(50), session_token VARCHAR(64), activity_at DATETIME, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME NULL)');
        $db->query('CREATE TABLE user_roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(50), permissions TEXT, created_at DATETIME, updated_at DATETIME)');
        $db->table('user_roles')->insert(['id' => 5, 'name' => 'Managers', 'permissions' => json_encode([Permission::TELESCOPE_MANAGE->value])]);
        $db->table('users')->insertBatch([
            ['id' => 'u1', 'name' => 'Иван Петров', 'email' => 'ivan@example.com', 'roles' => '[]', 'session_token' => 's-u1'],
            ['id' => 'u2', 'name' => 'Пётр Иванов', 'email' => 'petr@example.com', 'roles' => '[]', 'session_token' => 's-u2'],
            ['id' => 'boss', 'name' => 'Boss', 'email' => 'boss@example.com', 'roles' => '[5]', 'session_token' => 's-boss'],
        ]);

        $this->jobs = new TelescopeJobsModel();
    }

    protected function tearDown(): void
    {
        Time::setTestNow();
        putenv($this->secret === null ? 'auth.token.secret' : 'auth.token.secret=' . $this->secret);
        parent::tearDown();
    }

    private function as(string $email): array
    {
        $sid = Database::connect()->table('users')->where('email', $email)->get()->getRowArray()['session_token'];

        return ['Authorization' => generateAuthToken($email, $sid)];
    }

    private function job(string $status, array $fields = []): string
    {
        $id = $this->jobs->createJob([
            'target_name'  => 'M 101',
            'ra'           => 210.80225,
            'dec'          => 54.34894,
            'mode'         => 'simple',
            'preset'       => 'L',
            'plan'         => json_encode([['filter' => 'L', 'exposure' => 300, 'count' => 20]]),
            'min_altitude' => 30,
        ], 'u1', false);

        Database::connect()->table('telescope_jobs')->where('id', $id)->update(['status' => $status] + $fields);

        return $id;
    }

    private function repeat(string $id, string $email)
    {
        // SessionLibrary reads the token from the server variables, not the request headers
        service('superglobals')->setServer('HTTP_AUTHORIZATION', $this->as($email)['Authorization']);

        try {
            return $this->post("telescope/jobs/{$id}/repeat");
        } finally {
            service('superglobals')->unsetServer('HTTP_AUTHORIZATION');
        }
    }

    public function testTheAuthorsRepeatWaitsForApprovalWithEverythingReset(): void
    {
        Time::setTestNow('2026-11-12 08:00:00', 'UTC');
        $id = $this->job(Telescope::STATUS_COMPLETED, [
            'progress'       => '{"L":20}',
            'first_frame_at' => '2026-11-01 19:00:00',
            'last_frame_at'  => '2026-11-01 22:00:00',
            'accepted_at'    => '2026-11-01 10:00:00',
            'started_at'     => '2026-11-01 19:00:00',
            'finished_at'    => '2026-11-01 22:00:00',
            'reviewed_by'    => 'boss',
            'reviewed_at'    => '2026-11-01 09:00:00',
            'held'           => 1,
            'pinned'         => 1,
            'priority'       => 7,
            'last_seq'       => 12,
            'valid_until'    => '2026-11-05',
        ]);

        $result = $this->repeat($id, 'ivan@example.com');
        $result->assertStatus(200);
        $body = json_decode($result->getJSON(), true);
        $this->assertSame(Telescope::STATUS_PENDING, $body['job']['status']);
        $this->assertSame('2026-11-12T08:00:00Z', $body['job']['repeatedAt']);
        $this->assertArrayHasKey('message', $body);

        $row = $this->jobs->find($id);
        $this->assertSame('{}', $row['progress']);
        foreach (['first_frame_at', 'last_frame_at', 'accepted_at', 'started_at', 'finished_at', 'reviewed_by', 'reviewed_at', 'cancel_requested_at', 'status_reason'] as $field) {
            $this->assertNull($row[$field], $field);
        }
        $this->assertSame(0, (int) $row['held']);
        // Kept: the pin, the priority and the agent's seq (its next update goes on from it)
        $this->assertSame(1, (int) $row['pinned']);
        $this->assertSame(7, (int) $row['priority']);
        $this->assertSame(12, (int) $row['last_seq']);
        $this->assertSame(2, (int) $row['version']);
        // A date already passed would expire it at once
        $this->assertNull($row['valid_until']);
    }

    public function testAManagersRepeatIsApprovedAndKeepsAFutureDate(): void
    {
        Time::setTestNow('2026-11-12 08:00:00', 'UTC');
        $id = $this->job(Telescope::STATUS_CANCELLED, ['valid_until' => '2026-12-01', 'cancel_requested_at' => '2026-11-10 10:00:00']);

        $this->repeat($id, 'boss@example.com')->assertStatus(200);

        $row = $this->jobs->find($id);
        $this->assertSame(Telescope::STATUS_APPROVED, $row['status']);
        $this->assertSame('boss', $row['reviewed_by']);
        $this->assertSame('2026-11-12 08:00:00', $row['reviewed_at']);
        $this->assertSame('2026-12-01', $row['valid_until']);
        $this->assertNull($row['cancel_requested_at']);
    }

    public function testOnlyAFinishedJobCanBeRepeated(): void
    {
        foreach ([Telescope::STATUS_FAILED, Telescope::STATUS_EXPIRED] as $status) {
            $this->repeat($this->job($status), 'ivan@example.com')->assertStatus(200);
        }

        foreach ([Telescope::STATUS_REJECTED, Telescope::STATUS_PENDING, Telescope::STATUS_APPROVED, Telescope::STATUS_QUEUED, Telescope::STATUS_RUNNING] as $status) {
            $id = $this->job($status);
            $this->repeat($id, 'boss@example.com')->assertStatus(409);
            $this->assertSame($status, $this->jobs->find($id)['status'], $status);
        }
    }

    public function testAStrangerGetsNotFound(): void
    {
        $id = $this->job(Telescope::STATUS_COMPLETED);

        $this->repeat($id, 'petr@example.com')->assertStatus(404);
        $this->post("telescope/jobs/{$id}/repeat")->assertStatus(401);
        $this->assertSame(Telescope::STATUS_COMPLETED, $this->jobs->find($id)['status']);
    }

    public function testTheAuthorsActiveJobsLimitHolds(): void
    {
        // The default limit is 3 active jobs
        $this->job(Telescope::STATUS_PENDING);
        $this->job(Telescope::STATUS_QUEUED);
        $this->job(Telescope::STATUS_RUNNING);
        $id = $this->job(Telescope::STATUS_COMPLETED, ['progress' => '{"L":20}']);

        $this->repeat($id, 'ivan@example.com')->assertStatus(409);
        $row = $this->jobs->find($id);
        $this->assertSame(Telescope::STATUS_COMPLETED, $row['status']);
        $this->assertSame('{"L":20}', $row['progress']);

        // A manager is not limited by the author's jobs
        $this->repeat($id, 'boss@example.com')->assertStatus(200);
    }

    public function testRestoreTakesARepeatBack(): void
    {
        $id       = $this->job(Telescope::STATUS_COMPLETED, ['progress' => '{"L":20}', 'finished_at' => '2026-11-01 22:00:00']);
        $previous = $this->jobs->repeat($id, null);
        $this->assertNotNull($previous);
        $this->assertNull($this->jobs->repeat($id, null), 'a second repeat finds nothing to change');

        $this->jobs->restore($id, $previous);

        $row = $this->jobs->find($id);
        $this->assertSame(Telescope::STATUS_COMPLETED, $row['status']);
        $this->assertSame('{"L":20}', $row['progress']);
        $this->assertSame('2026-11-01 22:00:00', $row['finished_at']);
        $this->assertNull($row['repeated_at']);
        $this->assertSame(3, (int) $row['version']);
    }
}
