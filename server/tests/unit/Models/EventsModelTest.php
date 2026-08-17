<?php

use App\Models\EventsModel;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Tests for EventsModel::excerptFromMarkdown() via reflection.
 * No database connection is needed — pure unit tests.
 *
 * @internal
 */
final class EventsModelTest extends CIUnitTestCase
{
    private EventsModel $model;
    private ReflectionMethod $excerptMethod;

    protected function setUp(): void
    {
        parent::setUp();

        $this->model = new EventsModel();

        $this->excerptMethod = new ReflectionMethod($this->model, 'excerptFromMarkdown');
        $this->excerptMethod->setAccessible(true);
    }

    private function excerpt(string $markdown, int $maxLength = 160): ?string
    {
        return $this->excerptMethod->invoke($this->model, $markdown, $maxLength);
    }

    public function testEmptyStringReturnsNull(): void
    {
        $this->assertNull($this->excerpt(''));
    }

    public function testWhitespaceOnlyReturnsNull(): void
    {
        $this->assertNull($this->excerpt("   \n\t  "));
    }

    public function testShortPlainTextIsReturnedUnchanged(): void
    {
        $this->assertSame('Приезжайте с тёплыми вещами.', $this->excerpt('Приезжайте с тёплыми вещами.'));
    }

    public function testHeadingMarkerIsStripped(): void
    {
        $this->assertSame('Программа вечера', $this->excerpt('## Программа вечера'));
    }

    public function testBoldAndItalicMarkersAreStripped(): void
    {
        $this->assertSame('Очень тёмное небо', $this->excerpt('**Очень** _тёмное_ __небо__'));
    }

    public function testInlineCodeMarkerIsUnwrapped(): void
    {
        $this->assertSame('Возьмите фонарик', $this->excerpt('Возьмите `фонарик`'));
    }

    public function testFencedCodeBlockIsRemoved(): void
    {
        $this->assertSame('До и после', $this->excerpt("До\n```\nconst x = 1;\n```\nи после"));
    }

    public function testLinkIsReplacedWithItsLabel(): void
    {
        $this->assertSame('Подробнее на сайте', $this->excerpt('Подробнее [на сайте](https://example.com)'));
    }

    public function testImageIsReplacedWithItsAltText(): void
    {
        $this->assertSame('Место сбора карта', $this->excerpt('Место сбора ![карта](https://example.com/map.png)'));
    }

    public function testBlockquoteMarkerIsStripped(): void
    {
        $this->assertSame('Важное объявление', $this->excerpt('> Важное объявление'));
    }

    public function testListBulletsAreStripped(): void
    {
        $this->assertSame('Тёплые вещи Фонарик Термос', $this->excerpt("- Тёплые вещи\n- Фонарик\n- Термос"));
    }

    public function testMultipleBlankLinesCollapseToSingleSpace(): void
    {
        $this->assertSame('Первый абзац Второй абзац', $this->excerpt("Первый абзац\n\n\nВторой абзац"));
    }

    public function testTextExactlyAtMaxLengthIsNotTruncated(): void
    {
        $text = str_repeat('а', 160);
        $this->assertSame($text, $this->excerpt($text, 160));
    }

    public function testLongTextIsTruncatedOnWordBoundaryWithEllipsis(): void
    {
        $text   = 'Приглашаем всех желающих на выезд за город для наблюдения метеорного потока Персеиды. Будет тепло, ясно и очень много звёзд на безоблачном небе.';
        $result = $this->excerpt($text, 60);

        $this->assertSame('…', mb_substr($result, -1));
        $this->assertLessThanOrEqual(61, mb_strlen($result));
        // Never cuts a word in half — the excerpt is a prefix of the original text up to the ellipsis.
        $this->assertStringStartsWith(mb_substr($result, 0, -1), $text);
        $this->assertNotSame(' ', mb_substr($result, -2, 1));
    }

    public function testCustomMaxLengthIsRespected(): void
    {
        $result = $this->excerpt('Короткий, но не совсем короткий анонс мероприятия для проверки лимита', 20);

        $this->assertLessThanOrEqual(21, mb_strlen($result));
        $this->assertSame('…', mb_substr($result, -1));
    }
}
