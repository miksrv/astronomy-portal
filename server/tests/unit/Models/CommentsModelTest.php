<?php

use App\Models\CommentsModel;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Tests for CommentsModel private helper methods via reflection.
 * No database connection is needed — pure unit tests.
 *
 * @internal
 */
final class CommentsModelTest extends CIUnitTestCase
{
    private CommentsModel $model;
    private ReflectionMethod $truncateMethod;
    private ReflectionMethod $formatRowsMethod;

    protected function setUp(): void
    {
        parent::setUp();

        $this->model = new CommentsModel();

        $this->truncateMethod = new ReflectionMethod($this->model, 'truncateAuthorName');
        $this->truncateMethod->setAccessible(true);

        $this->formatRowsMethod = new ReflectionMethod($this->model, 'formatRows');
        $this->formatRowsMethod->setAccessible(true);
    }

    // --- truncateAuthorName() tests ---

    public function testTruncateAuthorNameEmptyStringReturnsEmptyString(): void
    {
        $result = $this->truncateMethod->invoke($this->model, '');
        $this->assertSame('', $result);
    }

    public function testTruncateAuthorNameWhitespaceOnlyReturnsEmptyString(): void
    {
        $result = $this->truncateMethod->invoke($this->model, '   ');
        $this->assertSame('', $result);
    }

    public function testTruncateAuthorNameSingleWordReturnedUnchanged(): void
    {
        $result = $this->truncateMethod->invoke($this->model, 'Alice');
        $this->assertSame('Alice', $result);
    }

    public function testTruncateAuthorNameTwoWordsReturnFirstNameWithLastInitial(): void
    {
        $result = $this->truncateMethod->invoke($this->model, 'Alice Smith');
        $this->assertSame('Alice S.', $result);
    }

    public function testTruncateAuthorNameCyrillicTwoWordsReturnFirstNameWithLastInitial(): void
    {
        $result = $this->truncateMethod->invoke($this->model, 'Иван Петров');
        $this->assertSame('Иван П.', $result);
    }

    public function testTruncateAuthorNameThreeWordsUsesFirstAndSecondWordInitial(): void
    {
        // explode on space gives [$first, $second, $third]; only $parts[1] is used
        $result = $this->truncateMethod->invoke($this->model, 'Alice Mary Smith');
        $this->assertSame('Alice M.', $result);
    }

    public function testTruncateAuthorNameLastNameSingleCharReturnedCorrectly(): void
    {
        $result = $this->truncateMethod->invoke($this->model, 'Bob X');
        $this->assertSame('Bob X.', $result);
    }

    // --- formatRows() tests (keepEntity = false, default) ---

    public function testFormatRowsEmptyInputReturnsEmptyArray(): void
    {
        $result = $this->formatRowsMethod->invoke($this->model, []);
        $this->assertSame([], $result);
    }

    public function testFormatRowsBuildsCreatedAtFromCreatedAtField(): void
    {
        $rows = [
            [
                'id'          => 'cmt-1',
                'user_id'     => 'usr-1',
                'entity_type' => 'event',
                'entity_id'   => 'evt-1',
                'content'     => 'Great event!',
                'rating'      => 5,
                'status'      => 'visible',
                'created_at'  => '2024-05-01 10:00:00',
                'author_name' => 'Alice Smith',
                'avatar'      => 'alice.jpg',
            ],
        ];

        $result = $this->formatRowsMethod->invoke($this->model, $rows);

        $this->assertArrayHasKey('createdAt', $result[0]);
        $this->assertSame('2024-05-01 10:00:00', $result[0]['createdAt']);
    }

    public function testFormatRowsBuildsAuthorObject(): void
    {
        $rows = [
            [
                'id'          => 'cmt-1',
                'user_id'     => 'usr-42',
                'entity_type' => 'event',
                'entity_id'   => 'evt-1',
                'content'     => 'Lovely!',
                'rating'      => 4,
                'status'      => 'visible',
                'created_at'  => '2024-05-01 10:00:00',
                'author_name' => 'Bob Jones',
                'avatar'      => 'bob.png',
            ],
        ];

        $result = $this->formatRowsMethod->invoke($this->model, $rows);
        $author = $result[0]['author'];

        $this->assertSame('usr-42', $author['id']);
        $this->assertSame('Bob J.', $author['name']);
        $this->assertSame('bob.png', $author['avatar']);
    }

    public function testFormatRowsRemovesRawDbFields(): void
    {
        $rows = [
            [
                'id'          => 'cmt-1',
                'user_id'     => 'usr-1',
                'entity_type' => 'event',
                'entity_id'   => 'evt-1',
                'content'     => 'Nice.',
                'rating'      => 3,
                'status'      => 'visible',
                'created_at'  => '2024-01-01 00:00:00',
                'author_name' => 'Alice Smith',
                'avatar'      => null,
            ],
        ];

        $result = $this->formatRowsMethod->invoke($this->model, $rows);

        $this->assertArrayNotHasKey('created_at', $result[0]);
        $this->assertArrayNotHasKey('author_name', $result[0]);
        $this->assertArrayNotHasKey('avatar', $result[0]);
        $this->assertArrayNotHasKey('user_id', $result[0]);
        $this->assertArrayNotHasKey('entity_type', $result[0]);
        $this->assertArrayNotHasKey('entity_id', $result[0]);
        $this->assertArrayNotHasKey('status', $result[0]);
    }

    public function testFormatRowsWithoutKeepEntityDoesNotExposeEntityFields(): void
    {
        $rows = [
            [
                'id'          => 'cmt-1',
                'user_id'     => 'usr-1',
                'entity_type' => 'event',
                'entity_id'   => 'evt-1',
                'content'     => 'Nice.',
                'rating'      => 3,
                'status'      => 'visible',
                'created_at'  => '2024-01-01 00:00:00',
                'author_name' => 'Alice Smith',
                'avatar'      => null,
            ],
        ];

        $result = $this->formatRowsMethod->invoke($this->model, $rows, false);

        $this->assertArrayNotHasKey('entityType', $result[0]);
        $this->assertArrayNotHasKey('entityId', $result[0]);
    }

    public function testFormatRowsWithKeepEntityExposesEntityTypeAndEntityId(): void
    {
        $rows = [
            [
                'id'          => 'cmt-2',
                'user_id'     => 'usr-7',
                'entity_type' => 'photo',
                'entity_id'   => 'ph-99',
                'content'     => 'Beautiful shot.',
                'rating'      => 5,
                'status'      => 'visible',
                'created_at'  => '2024-06-01 12:00:00',
                'author_name' => 'Vera Long',
                'avatar'      => null,
            ],
        ];

        $result = $this->formatRowsMethod->invoke($this->model, $rows, true);

        $this->assertArrayHasKey('entityType', $result[0]);
        $this->assertArrayHasKey('entityId', $result[0]);
        $this->assertSame('photo', $result[0]['entityType']);
        $this->assertSame('ph-99', $result[0]['entityId']);
    }

    public function testFormatRowsMultipleRowsAreAllFormatted(): void
    {
        $makeRow = static fn (string $id, string $name): array => [
            'id'          => $id,
            'user_id'     => 'usr-' . $id,
            'entity_type' => 'event',
            'entity_id'   => 'evt-1',
            'content'     => 'text',
            'rating'      => 5,
            'status'      => 'visible',
            'created_at'  => '2024-01-01 00:00:00',
            'author_name' => $name,
            'avatar'      => null,
        ];

        $result = $this->formatRowsMethod->invoke($this->model, [
            $makeRow('c1', 'Alice Smith'),
            $makeRow('c2', 'Bob Jones'),
        ]);

        $this->assertCount(2, $result);
        $this->assertSame('Alice S.', $result[0]['author']['name']);
        $this->assertSame('Bob J.', $result[1]['author']['name']);
    }

    public function testFormatRowsAuthorAvatarNullWhenMissing(): void
    {
        $rows = [
            [
                'id'          => 'cmt-1',
                'user_id'     => 'usr-1',
                'entity_type' => 'event',
                'entity_id'   => 'evt-1',
                'content'     => 'text',
                'rating'      => 4,
                'status'      => 'visible',
                'created_at'  => '2024-01-01 00:00:00',
                'author_name' => 'Alice',
                'avatar'      => null,
            ],
        ];

        $result = $this->formatRowsMethod->invoke($this->model, $rows);
        $this->assertNull($result[0]['author']['avatar']);
    }
}
