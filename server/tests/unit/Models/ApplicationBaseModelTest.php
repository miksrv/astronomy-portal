<?php

use App\Models\ApplicationBaseModel;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class ApplicationBaseModelTest extends CIUnitTestCase
{
    private ApplicationBaseModel $model;
    private \ReflectionMethod $generateIdMethod;

    protected function setUp(): void
    {
        parent::setUp();

        // Create anonymous subclass to avoid abstract-class issues;
        // no DB connection is made just by instantiation when no query is executed
        $this->model = new class extends ApplicationBaseModel {};

        $this->generateIdMethod = new ReflectionMethod($this->model, 'generateId');
        $this->generateIdMethod->setAccessible(true);
    }

    // --- generateId() tests ---

    public function testGenerateIdReturnsDataWithIdKey(): void
    {
        $result = $this->generateIdMethod->invoke($this->model, ['data' => ['name' => 'test']]);
        $this->assertArrayHasKey('id', $result['data']);
    }

    public function testGenerateIdReturnsNonEmptyId(): void
    {
        $result = $this->generateIdMethod->invoke($this->model, ['data' => ['name' => 'test']]);
        $this->assertNotEmpty($result['data']['id']);
    }

    public function testGenerateIdReturnsStringId(): void
    {
        $result = $this->generateIdMethod->invoke($this->model, ['data' => ['name' => 'test']]);
        $this->assertIsString($result['data']['id']);
    }

    public function testGenerateIdPreservesExistingDataKeys(): void
    {
        $result = $this->generateIdMethod->invoke($this->model, ['data' => ['name' => 'test']]);
        $this->assertSame('test', $result['data']['name']);
    }

    // --- prepareOutput() tests ---

    public function testPrepareOutputWithNoHiddenFieldsReturnsOriginalData(): void
    {
        $data   = ['data' => ['name' => 'Alice', 'email' => 'alice@example.com'], 'method' => 'findAll'];
        $result = $this->model->prepareOutput($data);
        $this->assertSame($data, $result);
    }

    public function testPrepareOutputWithFalseDataReturnsOriginalData(): void
    {
        // Setting hiddenFields via reflection so it's non-empty but data is falsy
        $reflection = new ReflectionProperty($this->model, 'hiddenFields');
        $reflection->setAccessible(true);
        $reflection->setValue($this->model, ['password']);

        $data   = ['data' => false, 'method' => 'findAll'];
        $result = $this->model->prepareOutput($data);
        $this->assertSame($data, $result);

        // Reset
        $reflection->setValue($this->model, []);
    }

    public function testPrepareOutputHidesSpecifiedFieldFromFindAllResult(): void
    {
        $reflection = new ReflectionProperty($this->model, 'hiddenFields');
        $reflection->setAccessible(true);
        $reflection->setValue($this->model, ['password']);

        $data = [
            'method' => 'findAll',
            'data'   => [
                ['name' => 'Alice', 'password' => 'secret'],
            ],
        ];

        $result = $this->model->prepareOutput($data);
        $this->assertArrayNotHasKey('password', $result['data'][0]);
        $this->assertArrayHasKey('name', $result['data'][0]);

        $reflection->setValue($this->model, []);
    }

    public function testPrepareOutputHidesSpecifiedFieldFromFindResult(): void
    {
        $reflection = new ReflectionProperty($this->model, 'hiddenFields');
        $reflection->setAccessible(true);
        $reflection->setValue($this->model, ['password']);

        $data = [
            'method' => 'find',
            'data'   => ['name' => 'Bob', 'password' => 'secret'],
        ];

        $result = $this->model->prepareOutput($data);
        $this->assertArrayNotHasKey('password', $result['data']);
        $this->assertArrayHasKey('name', $result['data']);

        $reflection->setValue($this->model, []);
    }
}
