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

        // Set test JWT secret and token TTL for generateAuthToken() tests
        putenv('auth.token.secret=test-secret-key-for-unit-tests');
        putenv('auth.token.live=3600');
    }

    protected function tearDown(): void
    {
        parent::tearDown();

        // Clean up environment variables
        putenv('auth.token.secret');
        putenv('auth.token.live');
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

    public function testGenerateAuthTokenDifferentEmailsProduceDifferentTokens(): void
    {
        $token1 = generateAuthToken('alice@example.com');
        $token2 = generateAuthToken('bob@example.com');
        $this->assertNotSame($token1, $token2);
    }

    // --- validateAuthToken() tests ---

    public function testValidateAuthTokenWithNullReturnsNull(): void
    {
        $result = validateAuthToken(null);
        $this->assertNull($result);
    }

    public function testValidateAuthTokenWithEmptyStringReturnsNull(): void
    {
        $result = validateAuthToken('');
        $this->assertNull($result);
    }

    public function testValidateAuthTokenWithInvalidTokenReturnsNull(): void
    {
        // JWT::decode throws for a malformed token; the helper catches \Throwable
        $result = validateAuthToken('this.is.notvalid');
        $this->assertNull($result);
    }

    public function testValidateAuthTokenWithArbitraryStringReturnsNull(): void
    {
        $result = validateAuthToken('not-a-jwt-at-all');
        $this->assertNull($result);
    }
}
