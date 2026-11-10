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
        $this->assertArrayHasKey('message', $json);
    }

    public function testPatchObjectWithoutTokenReturns401(): void
    {
        $result = $this->patch('objects/M31', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testDeleteObjectWithoutTokenReturns401(): void
    {
        $result = $this->delete('objects/M31');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    // --- Photos endpoints ---

    public function testSimbadLookupWithoutTokenReturns401(): void
    {
        $result = $this->get('objects/simbad/M_51');

        $result->assertStatus(401);
    }

    public function testPostPhotosWithoutTokenReturns401(): void
    {
        $result = $this->post('photos', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testPostPhotoSolveWithoutTokenReturns401(): void
    {
        $result = $this->post('photos/abc123/astrometry', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    // --- Mailings endpoints ---

    public function testGetMailingsWithoutTokenReturns401(): void
    {
        $result = $this->get('mailings');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    // --- Photos endpoints (write operations) ---

    public function testPatchPhotoWithoutTokenReturns401(): void
    {
        $result = $this->patch('photos/abc123', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testDeletePhotoWithoutTokenReturns401(): void
    {
        $result = $this->delete('photos/abc123');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    // --- Events endpoints ---

    public function testGetEventMembersWithoutTokenReturns401(): void
    {
        $result = $this->get('events/members/abc123');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testPostEventsWithoutTokenReturns401(): void
    {
        $result = $this->post('events', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testPatchEventWithoutTokenReturns401(): void
    {
        $result = $this->patch('events/abc123', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testDeleteEventWithoutTokenReturns401(): void
    {
        $result = $this->delete('events/abc123');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    // --- Comments endpoints ---

    public function testPostCommentsWithoutTokenReturns401(): void
    {
        $result = $this->post('comments', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testDeleteCommentWithoutTokenReturns401(): void
    {
        $result = $this->delete('comments/abc123');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    // --- Members endpoints ---

    public function testGetMembersWithoutTokenReturns401(): void
    {
        $result = $this->get('members');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testGetMemberEventsWithoutTokenReturns401(): void
    {
        $result = $this->get('members/abc123/events');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    // --- Mailings write endpoints ---

    public function testGetMailingPreviewWithoutTokenReturns401(): void
    {
        $result = $this->get('mailings/abc123/preview');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testPostMailingsWithoutTokenReturns401(): void
    {
        $result = $this->post('mailings', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testDeleteMailingWithoutTokenReturns401(): void
    {
        $result = $this->delete('mailings/abc123');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    // --- Roles endpoints ---

    public function testGetRolesWithoutTokenReturns401(): void
    {
        $result = $this->get('roles');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testGetRolePermissionsWithoutTokenReturns401(): void
    {
        $result = $this->get('roles/permissions');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testPostRolesWithoutTokenReturns401(): void
    {
        $result = $this->post('roles', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testPatchRoleWithoutTokenReturns401(): void
    {
        $result = $this->patch('roles/1', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testDeleteRoleWithoutTokenReturns401(): void
    {
        $result = $this->delete('roles/1');
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    public function testPatchMemberRolesWithoutTokenReturns401(): void
    {
        $result = $this->patch('members/abc123/roles', []);
        $result->assertStatus(401);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('message', $json);
    }

    // --- Observatory agent ---

    public function testAgentStatusWithoutTokenReturns401(): void
    {
        $result = $this->post('observatory/agent/status', []);
        $result->assertStatus(401);
    }

    public function testAgentStatusWithWrongTokenReturns401(): void
    {
        $result = $this->withHeaders(['Authorization' => 'Bearer not-the-agent-token-not-the-agent-token'])
            ->post('observatory/agent/status', []);
        $result->assertStatus(401);
    }

    public function testAgentSyncEndpointsWithoutTheAgentTokenReturn401(): void
    {
        foreach ([['get', 'observatory/agent/jobs'], ['post', 'observatory/agent/updates'], ['get', 'observatory/agent/patrol'], ['post', 'observatory/agent/patrol/visits'], ['post', 'observatory/agent/plan']] as [$method, $path]) {
            $this->{$method}($path, [])->assertStatus(401);
            $this->withHeaders(['Authorization' => 'Bearer not-the-agent-token-not-the-agent-token'])->{$method}($path, [])->assertStatus(401);
        }
    }

    // --- Telescope jobs: every endpoint but the form config needs a session ---

    public function testTelescopeJobEndpointsWithoutTokenReturn401(): void
    {
        // The public list, a job page and tonight's plan are open; one's own list and every write are not
        foreach ([
            ['get', 'telescope/jobs?mine=1'],
            ['get', 'telescope/jobs?all=1'],
            ['post', 'telescope/jobs'],
            ['patch', 'telescope/jobs/abc123'],
            ['delete', 'telescope/jobs/abc123'],
            ['post', 'telescope/jobs/abc123/approve'],
            ['post', 'telescope/jobs/abc123/reject'],
            ['post', 'telescope/jobs/abc123/remove'],
        ] as [$method, $path]) {
            $result = $this->{$method}($path, []);
            $result->assertStatus(401);
            $this->assertArrayHasKey('message', json_decode($result->getJSON(), true), "{$method} {$path}");
        }
    }
}
