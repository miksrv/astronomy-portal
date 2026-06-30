<?php

use App\Entities\EmailQueueEntity;
use App\Models\EmailQueueModel;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Configuration-level unit tests for EmailQueueModel (no database connection).
 *
 * App migrations rely on MySQL-specific column types and do not run on the
 * in-memory SQLite test DB, so — like PaymentsModelTest — this asserts the
 * model contract rather than exercising live queries. The migration itself is
 * validated against MariaDB via `composer migration:run`.
 *
 * @internal
 */
final class EmailQueueModelTest extends CIUnitTestCase
{
    private EmailQueueModel $model;

    protected function setUp(): void
    {
        parent::setUp();
        $this->model = new EmailQueueModel();
    }

    private function prop(string $name)
    {
        $reflection = new ReflectionProperty($this->model, $name);
        $reflection->setAccessible(true);

        return $reflection->getValue($this->model);
    }

    public function testTableName(): void
    {
        $this->assertSame('email_queue', $this->prop('table'));
    }

    public function testReturnTypeIsEmailQueueEntity(): void
    {
        $this->assertSame(EmailQueueEntity::class, $this->prop('returnType'));
    }

    public function testDoesNotUseSoftDeletes(): void
    {
        $this->assertFalse($this->prop('useSoftDeletes'));
    }

    public function testDoesNotAutoIncrement(): void
    {
        $this->assertFalse($this->prop('useAutoIncrement'));
    }

    public function testGeneratesIdBeforeInsert(): void
    {
        $this->assertContains('generateId', $this->prop('beforeInsert'));
    }

    public function testAllowedFieldsCoverQueueColumns(): void
    {
        $allowed  = $this->prop('allowedFields');
        $expected = [
            'email', 'subject', 'body', 'attachment_path',
            'status', 'attempts', 'error_message', 'sent_at',
        ];

        foreach ($expected as $field) {
            $this->assertContains($field, $allowed, "Missing allowed field: {$field}");
        }
    }

    public function testEntityDefaultsToQueuedStatus(): void
    {
        $entity = new EmailQueueEntity();

        $this->assertSame(EmailQueueEntity::STATUS_QUEUED, $entity->status);
        $this->assertSame(0, $entity->attempts);
    }
}
