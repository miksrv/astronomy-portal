<?php

use App\Database\Migrations\AddTelescopeJobs;
use CodeIgniter\Test\CIUnitTestCase;
use Config\Database;
use Tests\Support\Database\TelescopeTables;

/**
 * The telescope tables migrate on SQLite, seed their settings once, and enforce the
 * uniqueness the agent's idempotency relies on.
 *
 * @internal
 */
final class TelescopeMigrationTest extends CIUnitTestCase
{
    use TelescopeTables;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createTelescopeTables();
    }

    public function testSeedsEverySetting(): void
    {
        $rows = Database::connect()->table('observatory_settings')->get()->getResultArray();
        $this->assertSame(AddTelescopeJobs::SETTINGS, array_column($rows, 'value', 'key'));
        $this->assertSame('0', AddTelescopeJobs::SETTINGS['autonomous_mode']);
    }

    public function testRerunKeepsChangedSettings(): void
    {
        $db = Database::connect();
        $db->table('observatory_settings')->where('key', 'job_max_active')->update(['value' => '5']);
        $db->table('observatory_settings')->where('key', 'patrol_count')->delete();

        (new AddTelescopeJobs(Database::forge()))->up();

        $values = array_column($db->table('observatory_settings')->get()->getResultArray(), 'value', 'key');
        $this->assertSame('5', $values['job_max_active']);
        $this->assertSame('5', $values['patrol_count']);
        $this->assertCount(count(AddTelescopeJobs::SETTINGS), $values);
    }

    public function testJobUpdateSeqIsUniquePerJob(): void
    {
        $db = Database::connect();
        $db->table('telescope_jobs')->insert(['id' => 'job1', 'user_id' => 'u1', 'target_name' => 'M 101', 'ra' => 210.8, 'dec' => 54.35, 'plan' => '[]']);
        $row = ['job_id' => 'job1', 'seq' => 1, 'type' => 'accepted', 'time' => '2026-11-05 12:00:00'];
        $this->assertTrue($db->table('telescope_job_updates')->insert($row));

        $db->transBegin();
        $inserted = @$db->table('telescope_job_updates')->insert($row);
        $db->transRollback();
        $this->assertFalse($inserted);
    }
}
