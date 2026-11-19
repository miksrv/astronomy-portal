<?php

use App\Models\CommentsModel;
use CodeIgniter\Test\CIUnitTestCase;
use Config\Database;

/**
 * The reviews of the landing (`GET /comments/random`) and the rating summary of the reviews
 * (`summary` of `GET /comments` and `/comments/random`), against real tables on SQLite.
 *
 * @internal
 */
final class CommentsRatingTest extends CIUnitTestCase
{
    private CommentsModel $model;

    protected function setUp(): void
    {
        parent::setUp();

        $db = Database::connect();

        foreach (['comments', 'users', 'events'] as $table) {
            $db->query('DROP TABLE IF EXISTS "' . $table . '"');
        }

        // The columns the review queries read (the real tables have MySQL ENUMs)
        $db->query('CREATE TABLE users (id VARCHAR(15) PRIMARY KEY, name VARCHAR(100), avatar VARCHAR(40))');
        $db->query('CREATE TABLE events (id VARCHAR(15) PRIMARY KEY, title_ru VARCHAR(200), title_en VARCHAR(200), date DATETIME)');
        $db->query('CREATE TABLE comments (id VARCHAR(15) PRIMARY KEY, user_id VARCHAR(15), entity_type VARCHAR(10), entity_id VARCHAR(15), content TEXT, rating INTEGER NULL, status VARCHAR(10), created_at DATETIME, updated_at DATETIME, deleted_at DATETIME NULL)');

        $db->table('users')->insert(['id' => 'u1', 'name' => 'Анна Смирнова', 'avatar' => null]);
        $db->table('events')->insertBatch([
            ['id' => 'e1', 'title_ru' => 'Персеиды', 'title_en' => 'Perseids', 'date' => '2026-08-12 21:30:00'],
            ['id' => 'e2', 'title_ru' => 'Тротуарная астрономия', 'title_en' => 'Sidewalk astronomy', 'date' => '2026-09-24 20:00:00'],
        ]);

        $long = str_repeat('Звёзды над степью. ', 6); // ~114 characters, ~210 bytes

        $db->table('comments')->insertBatch([
            $this->review('c1', 'e1', $long, 5),
            $this->review('c2', 'e1', 'Спасибо!', 5),
            $this->review('c3', 'e1', $long, 3),
            $this->review('c4', 'e2', $long, 4),
            $this->review('c5', 'e2', $long, null),
            $this->review('c6', 'e2', $long, 1, 'hidden'),
            $this->review('c7', 'e2', $long, 1, 'visible', '2026-09-25 00:00:00'),
        ]);

        $this->model = new CommentsModel();
    }

    private function review(string $id, string $eventId, string $content, ?int $rating, string $status = 'visible', ?string $deletedAt = null): array
    {
        return [
            'id'          => $id,
            'user_id'     => 'u1',
            'entity_type' => 'event',
            'entity_id'   => $eventId,
            'content'     => $content,
            'rating'      => $rating,
            'status'      => $status,
            'created_at'  => '2026-09-01 12:00:00',
            'deleted_at'  => $deletedAt,
        ];
    }

    public function testRandomWithoutFiltersReturnsEveryVisibleReview(): void
    {
        $ids = array_column($this->model->getRandom('event', 50), 'id');

        sort($ids);
        $this->assertSame(['c1', 'c2', 'c3', 'c4', 'c5'], $ids);
    }

    public function testRandomKeepsOnlyTheBestAndFullestReviews(): void
    {
        $rows = $this->model->getRandom('event', 50, 5, 80);

        $this->assertSame(['c1'], array_column($rows, 'id'));
    }

    public function testRandomMinLengthCountsCharactersNotBytes(): void
    {
        // «Спасибо!» is 8 characters (15 bytes): a 10-character floor must leave it out
        $ids = array_column($this->model->getRandom('event', 50, 5, 10), 'id');

        $this->assertSame(['c1'], $ids);
    }

    public function testRandomRowCarriesTheEventInTheLocaleWithoutEntityIds(): void
    {
        $row = $this->model->getRandom('event', 50, 5, 80, 'en')[0];

        $this->assertSame(['title' => 'Perseids', 'date' => '2026-08-12 21:30:00'], $row['entity']);
        $this->assertArrayNotHasKey('entityId', $row);
        $this->assertArrayNotHasKey('event_title_ru', $row);
        $this->assertSame('Анна С.', $row['author']['name']);
    }

    public function testSummaryOfTheTypeAveragesRatedVisibleReviews(): void
    {
        // Rated, visible, not deleted: 5, 5, 3, 4 (the unrated, hidden and deleted ones are out)
        $this->assertSame(['count' => 4, 'average' => 4.3], $this->model->getRatingSummary('event'));
    }

    public function testSummaryOfOneEntity(): void
    {
        $this->assertSame(['count' => 3, 'average' => 4.3], $this->model->getRatingSummary('event', 'e1'));
        $this->assertSame(['count' => 1, 'average' => 4.0], $this->model->getRatingSummary('event', 'e2'));
    }

    public function testSummaryWithoutRatingsHasNoAverage(): void
    {
        $this->assertSame(['count' => 0, 'average' => null], $this->model->getRatingSummary('photo'));
    }
}
