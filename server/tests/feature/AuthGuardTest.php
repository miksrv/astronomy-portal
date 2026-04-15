<?php

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * Tests that admin-only endpoints return 401 when called without an Authorization header.
 *
 * The SessionLibrary passes the token (null when header absent) to validateAuthToken(),
 * which returns null immediately without touching the database. No DB connection needed.
 *
 * @internal
 */
final class AuthGuardTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    // --- Objects endpoints ---

    public function testPostObjectsWithoutTokenReturns401(): void
    {
        $result = $this->post('objects', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    public function testPatchObjectWithoutTokenReturns401(): void
    {
        $result = $this->patch('objects/M31', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    public function testDeleteObjectWithoutTokenReturns401(): void
    {
        $result = $this->delete('objects/M31');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    // --- Photos endpoints ---

    public function testPostPhotosWithoutTokenReturns401(): void
    {
        $result = $this->post('photos', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    // --- Mailings endpoints ---

    public function testGetMailingsWithoutTokenReturns401(): void
    {
        $result = $this->get('mailings');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    // --- Events endpoints ---

    public function testGetEventMembersWithoutTokenReturns401(): void
    {
        $result = $this->get('events/members/abc123');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }
}
