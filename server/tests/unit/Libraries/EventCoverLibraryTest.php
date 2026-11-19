<?php

use App\Libraries\EventCoverLibrary;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * The cover of an event as WebP: the conversion of a cover stored before (the one-time
 * `events:covers-webp`), on a temporary folder.
 *
 * @internal
 */
final class EventCoverLibraryTest extends CIUnitTestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();

        if (!function_exists('imagewebp')) {
            $this->markTestSkipped('GD without WebP');
        }

        $this->root = sys_get_temp_dir() . '/covers-' . bin2hex(random_bytes(4)) . '/';
        mkdir($this->root . 'e1', 0755, true);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->root . 'e1/*') ?: [] as $file) {
            unlink($file);
        }

        @rmdir($this->root . 'e1');
        @rmdir($this->root);

        parent::tearDown();
    }

    /** The file names in the event's folder, sorted */
    private function files(): array
    {
        $files = array_map('basename', glob($this->root . 'e1/*') ?: []);
        sort($files);

        return $files;
    }

    /** A poster-like PNG: a gradient with stripes, so it does not compress to nothing */
    private function png(string $name, int $width, int $height): void
    {
        $image = imagecreatetruecolor($width, $height);

        for ($x = 0; $x < $width; $x += 4) {
            imagefilledrectangle($image, $x, 0, $x + 3, $height, imagecolorallocate($image, $x % 256, ($x * 3) % 256, 120));
        }

        imagepng($image, $this->root . 'e1/' . $name);
    }

    public function testConvertsTheCoverAndItsPreviewToWebpUnderANewName(): void
    {
        $this->png('cover.png', 1400, 788);
        $this->png('cover_preview.png', 585, 400);

        $covers = new EventCoverLibrary($this->root);
        $result = $covers->toWebp('e1', 'cover', 'png');
        $name   = $result['name'];

        // A new name each time: a replaced cover gets a new address (no stale cached image)
        $this->assertMatchesRegularExpression('/^cover-[0-9a-f]{8}$/', $name);

        // The old files stay until the event points at the new ones
        $this->assertFileExists($this->root . 'e1/cover.png');

        $covers->removeOtherCovers('e1', $name);

        $this->assertSame([$name . '.webp', $name . '_preview.webp'], $this->files());
        $this->assertSame([1400, 788], array_slice(getimagesize($this->root . "e1/{$name}.webp"), 0, 2));
        $this->assertSame([585, 400], array_slice(getimagesize($this->root . "e1/{$name}_preview.webp"), 0, 2));
        $this->assertSame(IMAGETYPE_WEBP, getimagesize($this->root . "e1/{$name}.webp")[2]);
    }

    public function testAWideCoverIsScaledDownToTheLargestWidthTheSiteShows(): void
    {
        $this->png('cover.png', 3000, 1500);

        $name = (new EventCoverLibrary($this->root))->toWebp('e1', 'cover', 'png')['name'];

        $this->assertSame([EventCoverLibrary::MAX_WIDTH, 960], array_slice(getimagesize($this->root . "e1/{$name}.webp"), 0, 2));
    }

    public function testConversionLeavesTheOldFiles(): void
    {
        $this->png('cover.png', 800, 600);

        $name = (new EventCoverLibrary($this->root))->toWebp('e1', 'cover', 'png')['name'];

        $this->assertFileExists($this->root . 'e1/cover.png');
        $this->assertFileExists($this->root . "e1/{$name}.webp");
    }

    public function testRemovingOtherCoversKeepsTheEventsOtherFiles(): void
    {
        // An earlier WebP cover, an old PNG one and a photo of the event in the same folder
        $this->png('cover-0000aaaa.webp', 10, 10);
        $this->png('cover.png', 10, 10);
        $this->png('6a7d45a54a98f.jpg', 10, 10);
        $this->png('cover-1111bbbb.webp', 10, 10);
        $this->png('cover-1111bbbb_preview.webp', 10, 10);

        (new EventCoverLibrary($this->root))->removeOtherCovers('e1', 'cover-1111bbbb');

        $this->assertSame(['6a7d45a54a98f.jpg', 'cover-1111bbbb.webp', 'cover-1111bbbb_preview.webp'], $this->files());
    }

    public function testAMissingCoverFails(): void
    {
        $this->expectException(RuntimeException::class);

        (new EventCoverLibrary($this->root))->toWebp('e1', 'cover', 'jpeg');
    }
}
