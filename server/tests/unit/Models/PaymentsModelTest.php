<?php

use App\Entities\PaymentEntity;
use App\Models\PaymentsModel;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Configuration-level unit tests for PaymentsModel (no database connection).
 *
 * @internal
 */
final class PaymentsModelTest extends CIUnitTestCase
{
    private PaymentsModel $model;

    protected function setUp(): void
    {
        parent::setUp();
        $this->model = new PaymentsModel();
    }

    private function prop(string $name)
    {
        $reflection = new ReflectionProperty($this->model, $name);
        $reflection->setAccessible(true);
        return $reflection->getValue($this->model);
    }

    public function testTableName(): void
    {
        $this->assertSame('payments', $this->prop('table'));
    }

    public function testReturnTypeIsPaymentEntity(): void
    {
        $this->assertSame(PaymentEntity::class, $this->prop('returnType'));
    }

    public function testUsesSoftDeletes(): void
    {
        $this->assertTrue($this->prop('useSoftDeletes'));
    }

    public function testDoesNotAutoIncrement(): void
    {
        $this->assertFalse($this->prop('useAutoIncrement'));
    }

    public function testGeneratesIdBeforeInsert(): void
    {
        $this->assertContains('generateId', $this->prop('beforeInsert'));
    }

    public function testAllowedFieldsCoverPaymentColumns(): void
    {
        $allowed  = $this->prop('allowedFields');
        $expected = [
            'gateway', 'order_number', 'order_id', 'entity_type', 'entity_id',
            'amount', 'currency', 'status', 'form_url', 'error_code',
            'error_message', 'paid_at', 'expires_at',
        ];

        foreach ($expected as $field) {
            $this->assertContains($field, $allowed, "Missing allowed field: {$field}");
        }
    }
}
