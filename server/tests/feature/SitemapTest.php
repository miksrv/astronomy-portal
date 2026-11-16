<?php

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;
use Config\Database;

/**
 * `GET /sitemap`: the ids behind the frontend's sitemap, each with its last-modified
 * time in one shape (ISO 8601 with the offset) for photos, objects and events alike,
 * and the API's noindex header.
 *
 * @internal
 */
final class SitemapTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    protected function setUp(): void
    {
        parent::setUp();

        $db = Database::connect();
        foreach (['photos', 'objects', 'events'] as $table) {
            $db->query('DROP TABLE IF EXISTS "' . $table . '"');
        }
        $db->query('CREATE TABLE photos (id VARCHAR(15) PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME NULL)');
        $db->query('CREATE TABLE objects (catalog_name VARCHAR(40) PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME NULL)');
        $db->query('CREATE TABLE events (id VARCHAR(15) PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME NULL)');

        $db->table('photos')->insert(['id' => 'p1', 'updated_at' => '2025-01-11 08:55:52']);
        $db->table('photos')->insert(['id' => 'p2', 'updated_at' => '2025-01-12 10:00:00', 'deleted_at' => '2025-02-01 00:00:00']);
        $db->table('objects')->insert(['catalog_name' => 'IC_1396', 'updated_at' => '2025-01-10 10:31:58']);
        $db->table('events')->insert(['id' => 'e1', 'updated_at' => null]);
    }

    public function testListsEveryKindWithIsoDates(): void
    {
        $result = $this->get('sitemap');
        $result->assertStatus(200);

        $data = json_decode($result->getJSON(), true);

        // The soft-deleted photo is not a page any more
        $this->assertSame(['p1'], array_column($data['photos'], 'id'));
        $this->assertSame(['IC_1396'], array_column($data['objects'], 'id'));
        $this->assertSame(['e1'], array_column($data['events'], 'id'));

        $iso = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/';
        $this->assertMatchesRegularExpression($iso, $data['photos'][0]['updated']);
        // Objects used to come back as a bare "Y-m-d H:i:s" string, unlike the other two
        $this->assertMatchesRegularExpression($iso, $data['objects'][0]['updated']);
        $this->assertStringStartsWith('2025-01-10T10:31:58', $data['objects'][0]['updated']);
        $this->assertNull($data['events'][0]['updated']);
    }

    public function testApiResponsesAreNotIndexed(): void
    {
        $this->get('sitemap')->assertHeader('X-Robots-Tag', 'noindex');
    }
}
