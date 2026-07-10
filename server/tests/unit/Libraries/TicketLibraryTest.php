<?php

use App\Libraries\TicketLibrary;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Verifies the event ticket renderer produces a valid, correctly-sized PNG and
 * that the temp-file variant is created with a .png extension and is deletable.
 *
 * @internal
 */
final class TicketLibraryTest extends CIUnitTestCase
{
    private array $sample = [
        'qrData'             => 'abc1234567890',
        'heading'            => 'Билет на астровыезд',
        'title'              => 'Тестовый платный астровыезд под Оренбургом',
        'dateLine'           => 'Пятница, 26 июня 2026',
        'timeLine'           => '21:00 — 01:00',
        'locationValue'      => 'Загородная обсерватория «Смотри на звёзды»',
        'addressValue'       => 'Трасса Р239, 15 км',
        'orderValue'         => 'ABC1234567890',
        'guestValue'         => 'Михаил Т.',
        'participantsLabel'  => 'Участников',
        'adultsValue'        => '2 взрослых',
        'childrenValue'      => '1 ребёнок',
    ];

    public function testRenderPngReturnsValidPngImage(): void
    {
        $png = (new TicketLibrary())->renderPng($this->sample);

        $this->assertNotEmpty($png);
        // PNG magic header.
        $this->assertSame("\x89PNG\r\n\x1a\n", substr($png, 0, 8));

        $image = imagecreatefromstring($png);
        $this->assertNotFalse($image);
        $this->assertSame(1400, imagesx($image));
        $this->assertSame(440, imagesy($image));
        imagedestroy($image);
    }

    public function testRenderHandlesEmptyAndMissingValuesGracefully(): void
    {
        // Empty optional fields must not throw and must still yield a valid PNG.
        $png = (new TicketLibrary())->renderPng(['qrData' => 'x']);

        $this->assertSame("\x89PNG\r\n\x1a\n", substr($png, 0, 8));
    }

    public function testRenderToTempFileCreatesDeletablePng(): void
    {
        $path = (new TicketLibrary())->renderToTempFile($this->sample);

        $this->assertFileExists($path);
        $this->assertStringEndsWith('.png', $path);
        $this->assertSame('image/png', mime_content_type($path));

        unlink($path);
        $this->assertFileDoesNotExist($path);
    }
}
