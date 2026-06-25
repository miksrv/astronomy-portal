<?php

namespace App\Libraries;

use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use GdImage;

/**
 * Renders an event ticket as a PNG image (template + overlaid data + QR).
 *
 * The library is presentation-only: it receives already-localised strings and
 * draws them — no DB access, no translation. The QR encodes the booking id
 * (events_users.id), the same value the check-in scanner expects, so emailed
 * and on-screen tickets remain compatible with {@see \App\Controllers\Events::checkin()}.
 *
 * Nothing is persisted by {@see renderPng()}; {@see renderToTempFile()} writes a
 * throwaway file the caller must delete after use (e.g. after emailing).
 */
class TicketLibrary
{
    private const WIDTH    = 1000;
    private const HEIGHT   = 560;
    private const PADDING  = 56;
    private const QR_SIZE  = 300;

    private string $fontPath;

    public function __construct()
    {
        $this->fontPath = APPPATH . 'Libraries/assets/OpenSans.ttf';
    }

    /**
     * Renders the ticket and returns the raw PNG bytes.
     *
     * Expected $data keys (all strings unless noted):
     *   qrData       — value encoded in the QR (the booking id)
     *   heading      — small caps line above the title (e.g. "Билет на астровыезд")
     *   title        — event title
     *   dateLabel    / dateValue
     *   peopleLabel  / peopleValue
     *   guestLabel   / guestValue
     *   footer       — hint under the QR (e.g. "Покажите QR-код на входе")
     *   coverPath    — optional absolute path to a background image (jpg/png)
     */
    public function renderPng(array $data): string
    {
        $canvas = imagecreatetruecolor(self::WIDTH, self::HEIGHT);

        $this->drawBackground($canvas, $data['coverPath'] ?? null);
        $this->drawAccent($canvas);

        $white  = imagecolorallocate($canvas, 255, 255, 255);
        $muted  = imagecolorallocate($canvas, 178, 188, 204);
        $accent = imagecolorallocate($canvas, 120, 170, 255);

        $textLeft  = self::PADDING;
        $textRight = self::WIDTH - self::QR_SIZE - self::PADDING * 2;
        $maxText   = $textRight - $textLeft;

        // Heading (small, accented, letter-spaced look via uppercase)
        $this->text($canvas, 15, $textLeft, 92, $accent, mb_strtoupper($data['heading'] ?? ''));

        // Title (large, wrapped to up to 3 lines)
        $titleLines = $this->wrap($data['title'] ?? '', 30, $maxText, 3);
        $y          = 150;
        foreach ($titleLines as $line) {
            $this->text($canvas, 30, $textLeft, $y, $white, $line);
            $y += 46;
        }

        $y = max($y + 18, 270);

        $rows = [
            [$data['dateLabel'] ?? '', $data['dateValue'] ?? ''],
            [$data['peopleLabel'] ?? '', $data['peopleValue'] ?? ''],
            [$data['guestLabel'] ?? '', $data['guestValue'] ?? ''],
        ];

        foreach ($rows as [$label, $value]) {
            if ($value === '') {
                continue;
            }

            $this->text($canvas, 14, $textLeft, $y, $muted, mb_strtoupper($label));
            $this->text($canvas, 21, $textLeft, $y + 30, $white, $value);
            $y += 76;
        }

        // QR block: white rounded card on the right, vertically centred-ish.
        $qrX = self::WIDTH - self::QR_SIZE - self::PADDING;
        $qrY = (int) ((self::HEIGHT - self::QR_SIZE) / 2) - 10;

        $this->roundedRect(
            $canvas,
            $qrX - 18,
            $qrY - 18,
            $qrX + self::QR_SIZE + 18,
            $qrY + self::QR_SIZE + 18,
            22,
            imagecolorallocate($canvas, 255, 255, 255)
        );

        $qr = $this->qrImage((string) ($data['qrData'] ?? ''), self::QR_SIZE);
        imagecopy($canvas, $qr, $qrX, $qrY, 0, 0, self::QR_SIZE, self::QR_SIZE);
        imagedestroy($qr);

        if (!empty($data['footer'])) {
            $footer = $data['footer'];
            $bbox   = imagettfbbox(13, 0, $this->fontPath, $footer);
            $fw     = $bbox[2] - $bbox[0];
            $fx     = $qrX + (int) ((self::QR_SIZE - $fw) / 2);
            $this->text($canvas, 13, $fx, $qrY + self::QR_SIZE + 44, $muted, $footer);
        }

        ob_start();
        imagepng($canvas);
        $png = (string) ob_get_clean();

        imagedestroy($canvas);

        return $png;
    }

    /**
     * Renders the ticket to a throwaway PNG file and returns its path.
     * The caller is responsible for deleting the file after use.
     */
    public function renderToTempFile(array $data): string
    {
        $path = tempnam(sys_get_temp_dir(), 'ticket_') . '.png';
        file_put_contents($path, $this->renderPng($data));

        return $path;
    }

    /**
     * Builds the QR code as a GD image.
     */
    private function qrImage(string $value, int $size): GdImage
    {
        $qr = new QrCode(
            data: $value !== '' ? $value : ' ',
            errorCorrectionLevel: ErrorCorrectionLevel::High,
            size: $size,
            margin: 0,
        );

        $image = imagecreatefromstring((new PngWriter())->write($qr)->getString());

        // Normalise to the exact requested size (writer may round up/down).
        if ($image !== false && (imagesx($image) !== $size || imagesy($image) !== $size)) {
            $scaled = imagecreatetruecolor($size, $size);
            imagecopyresampled($scaled, $image, 0, 0, 0, 0, $size, $size, imagesx($image), imagesy($image));
            imagedestroy($image);

            return $scaled;
        }

        return $image instanceof GdImage ? $image : imagecreatetruecolor($size, $size);
    }

    /**
     * Fills the canvas with the event cover (cover-fit + dark scrim) or a flat
     * dark background when no usable cover is available.
     */
    private function drawBackground(GdImage $canvas, ?string $coverPath): void
    {
        $base = imagecolorallocate($canvas, 15, 19, 24);
        imagefilledrectangle($canvas, 0, 0, self::WIDTH, self::HEIGHT, $base);

        $cover = $this->loadImage($coverPath);

        if ($cover instanceof GdImage) {
            $this->coverFit($canvas, $cover);
            imagedestroy($cover);

            // Dark scrim so light text stays legible over any cover.
            $scrim = imagecreatetruecolor(self::WIDTH, self::HEIGHT);
            imagefilledrectangle($scrim, 0, 0, self::WIDTH, self::HEIGHT, imagecolorallocate($scrim, 8, 11, 16));
            imagecopymerge($canvas, $scrim, 0, 0, 0, 0, self::WIDTH, self::HEIGHT, 68);
            imagedestroy($scrim);
        }
    }

    /**
     * Draws the cover image scaled to cover the whole canvas (centre crop).
     */
    private function coverFit(GdImage $canvas, GdImage $cover): void
    {
        $cw = imagesx($cover);
        $ch = imagesy($cover);

        if ($cw <= 0 || $ch <= 0) {
            return;
        }

        $scale = max(self::WIDTH / $cw, self::HEIGHT / $ch);
        $dw    = (int) ceil($cw * $scale);
        $dh    = (int) ceil($ch * $scale);
        $dx    = (int) (((self::WIDTH - $dw) / 2));
        $dy    = (int) (((self::HEIGHT - $dh) / 2));

        imagecopyresampled($canvas, $cover, $dx, $dy, 0, 0, $dw, $dh, $cw, $ch);
    }

    /**
     * Draws a thin accent bar down the left edge as a ticket-like flourish.
     */
    private function drawAccent(GdImage $canvas): void
    {
        $accent = imagecolorallocate($canvas, 120, 170, 255);
        imagefilledrectangle($canvas, 0, 0, 8, self::HEIGHT, $accent);
    }

    private function loadImage(?string $path): GdImage|false
    {
        if ($path === null || $path === '' || !is_file($path)) {
            return false;
        }

        $bytes = @file_get_contents($path);

        if ($bytes === false) {
            return false;
        }

        $image = @imagecreatefromstring($bytes);

        return $image instanceof GdImage ? $image : false;
    }

    private function text(GdImage $canvas, int $size, int $x, int $y, int $color, string $text): void
    {
        if ($text === '') {
            return;
        }

        imagettftext($canvas, $size, 0, $x, $y, $color, $this->fontPath, $text);
    }

    /**
     * Greedy word-wrap to a max pixel width, capped at $maxLines (last line
     * gets an ellipsis when truncated).
     *
     * @return string[]
     */
    private function wrap(string $text, int $fontSize, int $maxWidth, int $maxLines): array
    {
        $words = preg_split('/\s+/', trim($text)) ?: [];
        $lines = [];
        $line  = '';

        foreach ($words as $word) {
            $candidate = $line === '' ? $word : $line . ' ' . $word;
            $bbox      = imagettfbbox($fontSize, 0, $this->fontPath, $candidate);

            if (($bbox[2] - $bbox[0]) > $maxWidth && $line !== '') {
                $lines[] = $line;
                $line    = $word;

                if (count($lines) === $maxLines) {
                    break;
                }
            } else {
                $line = $candidate;
            }
        }

        if (count($lines) < $maxLines && $line !== '') {
            $lines[] = $line;
        } elseif (count($lines) === $maxLines) {
            $lines[$maxLines - 1] = rtrim(mb_substr($lines[$maxLines - 1], 0, 40)) . '…';
        }

        return $lines === [] ? [''] : $lines;
    }

    private function roundedRect(GdImage $im, int $x1, int $y1, int $x2, int $y2, int $r, int $color): void
    {
        imagefilledrectangle($im, $x1 + $r, $y1, $x2 - $r, $y2, $color);
        imagefilledrectangle($im, $x1, $y1 + $r, $x2, $y2 - $r, $color);
        imagefilledarc($im, $x1 + $r, $y1 + $r, $r * 2, $r * 2, 180, 270, $color, IMG_ARC_PIE);
        imagefilledarc($im, $x2 - $r, $y1 + $r, $r * 2, $r * 2, 270, 360, $color, IMG_ARC_PIE);
        imagefilledarc($im, $x1 + $r, $y2 - $r, $r * 2, $r * 2, 90, 180, $color, IMG_ARC_PIE);
        imagefilledarc($im, $x2 - $r, $y2 - $r, $r * 2, $r * 2, 0, 90, $color, IMG_ARC_PIE);
    }
}
