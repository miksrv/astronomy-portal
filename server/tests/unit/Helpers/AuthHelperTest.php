<?php

use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class AuthHelperTest extends CIUnitTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        helper('auth');
    }

    // --- hashUserPassword() tests ---

    public function testHashUserPasswordReturnsNonEmptyString(): void
    {
        $hash = hashUserPassword('test123');
        $this->assertNotEmpty($hash);
        $this->assertIsString($hash);
    }

    public function testHashUserPasswordUsesArgon2id(): void
    {
        $hash = hashUserPassword('test123');
        $this->assertStringStartsWith('$argon2id', $hash);
    }

    public function testHashUserPasswordVerifiesCorrectPassword(): void
    {
        $hash = hashUserPassword('test123');
        $this->assertTrue(password_verify('test123', $hash));
    }

    public function testHashUserPasswordDoesNotVerifyWrongPassword(): void
    {
        $hash = hashUserPassword('test123');
        $this->assertFalse(password_verify('wrong', $hash));
    }

    // --- generateAuthToken() tests ---

    public function testGenerateAuthTokenReturnsNonEmptyString(): void
    {
        $token = generateAuthToken('test@example.com');
        $this->assertNotEmpty($token);
        $this->assertIsString($token);
    }

    public function testGenerateAuthTokenHasJwtStructure(): void
    {
        $token = generateAuthToken('test@example.com');
        $parts = explode('.', $token);
        $this->assertCount(3, $parts, 'JWT should have exactly 3 dot-separated parts');
    }
}
