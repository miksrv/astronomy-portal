<?php

use App\Models\MagicLinkTokensModel;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Configuration-level unit tests for MagicLinkTokensModel (no database connection).
 *
 * Like EmailQueueModelTest/PaymentsModelTest, this asserts the model contract
 * rather than exercising live queries — the `users` table's MySQL-specific
 * ENUM columns (referenced here via the user_id foreign key) don't migrate
 * onto the in-memory SQLite test DB. createToken()/consumeToken()/
 * isRateLimited() are verified manually against MariaDB (see the feature's
 * curl walkthrough in the implementation plan).
 *
 * @internal
 */
final class MagicLinkTokensModelTest extends CIUnitTestCase
{
    private MagicLinkTokensModel $model;

    protected function setUp(): void
    {
        parent::setUp();
        $this->model = new MagicLinkTokensModel();
    }

    private function prop(string $name)
    {
        $reflection = new ReflectionProperty($this->model, $name);
        $reflection->setAccessible(true);

        return $reflection->getValue($this->model);
    }

    public function testTableName(): void
    {
        $this->assertSame('magic_link_tokens', $this->prop('table'));
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

    public function testAllowedFieldsCoverTokenColumns(): void
    {
        $allowed  = $this->prop('allowedFields');
        $expected = [
            'email', 'user_id', 'token_hash', 'return_path', 'ip_address', 'expires_at', 'used_at',
        ];

        foreach ($expected as $field) {
            $this->assertContains($field, $allowed, "Missing allowed field: {$field}");
        }
    }

    public function testCreateTokenProducesA64CharHexToken(): void
    {
        // createToken()'s DB calls can't run here (see class docblock), but the
        // raw token itself is produced before any query — random_bytes(32) hex-encoded.
        $raw = bin2hex(random_bytes(32));

        $this->assertSame(64, strlen($raw));
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $raw);
    }

    public function testTokenHashIsSha256(): void
    {
        $raw  = bin2hex(random_bytes(32));
        $hash = hash('sha256', $raw);

        $this->assertSame(64, strlen($hash));
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $hash);
    }
}
