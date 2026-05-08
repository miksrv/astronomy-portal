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

    // --- Photos endpoints (write operations) ---

    public function testPatchPhotoWithoutTokenReturns401(): void
    {
        $result = $this->patch('photos/abc123', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    public function testDeletePhotoWithoutTokenReturns401(): void
    {
        $result = $this->delete('photos/abc123');
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

    public function testPostEventsWithoutTokenReturns401(): void
    {
        $result = $this->post('events', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    public function testPatchEventWithoutTokenReturns401(): void
    {
        $result = $this->patch('events/abc123', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    public function testDeleteEventWithoutTokenReturns401(): void
    {
        $result = $this->delete('events/abc123');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    // --- Comments endpoints ---

    public function testPostCommentsWithoutTokenReturns401(): void
    {
        $result = $this->post('comments', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    public function testDeleteCommentWithoutTokenReturns401(): void
    {
        $result = $this->delete('comments/abc123');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    // --- Members endpoints ---

    public function testGetMembersWithoutTokenReturns401(): void
    {
        $result = $this->get('members');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    public function testGetMemberEventsWithoutTokenReturns401(): void
    {
        $result = $this->get('members/abc123/events');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    // --- Mailings write endpoints ---

    public function testPostMailingsWithoutTokenReturns401(): void
    {
        $result = $this->post('mailings', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }

    public function testDeleteMailingWithoutTokenReturns401(): void
    {
        $result = $this->delete('mailings/abc123');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('messages', $json);
    }
}
