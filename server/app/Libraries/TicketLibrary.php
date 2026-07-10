<?php

namespace App\Libraries;

use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use GdImage;

/**
 * Renders an event ticket as a PNG image (static background + overlaid data + QR).
 *
 * The ticket background (shape, notches, divider, QR placeholder card) is a
 * fixed asset ({@see BACKGROUND_PATH}) reused for every event — the library
 * itself is presentation-only: it receives already-localised strings and
 * draws them over that background, no DB access, no translation. The QR
 * encodes the frontend check-in URL (`/stargazing/checkin/{bookingId}`), so
 * scanning it with any camera app — not just the staff scanner — lands on a
 * page that calls {@see \App\Controllers\Events::checkin()} itself.
 *
 * Nothing is persisted by {@see renderPng()}; {@see renderToTempFile()} writes a
 * throwaway file the caller must delete after use (e.g. after emailing).
 */
class TicketLibrary
{
    private const WIDTH  = 1400;
    private const HEIGHT = 440;
    private const PADDING = 48;

    // Must match the layout baked into the background asset.
    private const QR_X    = 48;
    private const QR_Y    = 70;
    private const QR_SIZE = 300;
    private const DIVIDER_X = 1000;

    private const BACKGROUND_PATH = APPPATH . 'Libraries/assets/ticket-bg.png';

    private string $fontPath;

    public function __construct()
    {
        $this->fontPath = APPPATH . 'Libraries/assets/OpenSans.ttf';
    }

    /**
     * Renders the ticket and returns the raw PNG bytes.
     *
     * Expected $data keys (all strings unless noted):
     *   qrData             — value encoded in the QR (the check-in URL, e.g. "https://…/stargazing/checkin/{id}")
     *   heading            — fixed "ticket" label, e.g. "Билет на астровыезд"
     *   title              — event title
     *   dateLine           — weekday + date, e.g. "Четверг, 11 июля 2026"
     *   timeLine           — time (+ end-time range, if any), e.g. "21:30 — 00:00"
     *   locationValue      — venue name
     *   addressValue       — venue address (smaller, muted; empty hides the line)
     *   orderValue         — ticket id, e.g. "6A4EE2465DFDD" (gray, centered under the QR code)
     *   guestValue         — guest display name, e.g. "Михаил Т."
     *   participantsLabel  — e.g. "Участников"
     *   adultsValue        — e.g. "2 взрослых"
     *   childrenValue      — e.g. "2 ребёнка" (empty/omitted hides the line)
     */
    public function renderPng(array $data): string
    {
        $canvas = $this->loadBackground();

        $white  = imagecolorallocate($canvas, 255, 255, 255);
        $muted  = imagecolorallocate($canvas, 178, 188, 204);
        $accent = imagecolorallocate($canvas, 140, 172, 255);

        $textLeft  = self::QR_X + self::QR_SIZE + self::PADDING;
        $textRight = self::DIVIDER_X - 40;
        $maxText   = $textRight - $textLeft;

        // Fixed "ticket" heading, same size as the title, directly above it.
        $y = 108;

        if (!empty($data['heading'])) {
            $this->boldText($canvas, 30, $textLeft, $y, $accent, mb_strtoupper($data['heading']));
        }

        // Title (large, bold-ish, wrapped to up to 2 lines).
        $titleLines = $this->wrap($data['title'] ?? '', 30, $maxText, 2);
        $y          = 172;
        foreach ($titleLines as $line) {
            $this->boldText($canvas, 30, $textLeft, $y, $white, $line);
            $y += 40;
        }

        $y += 25;

        // Date and time share a single line, e.g. "Пятница, 26 июня 2026, 21:00 — 01:00".
        $dateTimeLine = trim(
            ($data['dateLine'] ?? '') . (!empty($data['dateLine']) && !empty($data['timeLine']) ? ', ' : '') . ($data['timeLine'] ?? '')
        );

        if ($dateTimeLine !== '') {
            $this->text($canvas, 21, $textLeft, $y, $white, $dateTimeLine);
            $y += 28;
        }

        $y += 20;

        if (!empty($data['locationValue'])) {
            foreach ($this->wrap($data['locationValue'], 19, $maxText, 2) as $line) {
                $this->text($canvas, 19, $textLeft, $y, $white, $line);
                $y += 25;
            }
        }

        if (!empty($data['addressValue'])) {
            $this->text($canvas, 15, $textLeft, $y, $muted, $this->wrap($data['addressValue'], 15, $maxText, 1)[0]);
            $y += 20;
        }

        $y += 35;
        $this->text($canvas, 17, $textLeft, $y, $accent, 'смотриназвезды.рф');

        // Right column: participant name, then participant counts.
        $colX     = self::DIVIDER_X + 60;
        $colWidth = self::WIDTH - self::PADDING - $colX;

        $ry = 140;

        if (!empty($data['guestValue'])) {
            foreach ($this->wrap($data['guestValue'], 23, $colWidth, 2) as $line) {
                $this->boldText($canvas, 23, $colX, $ry, $white, $line);
                $ry += 30;
            }
            $ry += 56;
        }

        if (!empty($data['adultsValue']) || !empty($data['childrenValue'])) {
            $this->text($canvas, 13, $colX, $ry, $muted, mb_strtoupper($data['participantsLabel'] ?? ''));
            $ry += 36;

            if (!empty($data['adultsValue'])) {
                $this->boldText($canvas, 22, $colX, $ry, $white, $data['adultsValue']);
                $ry += 32;
            }

            if (!empty($data['childrenValue'])) {
                $this->boldText($canvas, 22, $colX, $ry, $white, $data['childrenValue']);
            }
        }

        // QR code, pasted onto the placeholder card baked into the background.
        $qrInset = 20;
        $qrSize  = self::QR_SIZE - $qrInset * 2;
        $qr      = $this->qrImage((string) ($data['qrData'] ?? ''), $qrSize);
        imagecopy($canvas, $qr, self::QR_X + $qrInset, self::QR_Y + $qrInset, 0, 0, $qrSize, $qrSize);
        imagedestroy($qr);

        // Ticket id, centered under the QR code.
        if (!empty($data['orderValue'])) {
            $this->centeredText($canvas, 15, self::QR_X + self::QR_SIZE / 2, self::QR_Y + self::QR_SIZE + 30, $muted, $data['orderValue']);
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
     * Loads the static ticket background asset, falling back to a flat dark
     * canvas of the same size if the asset is somehow missing.
     */
    private function loadBackground(): GdImage
    {
        $image = is_file(self::BACKGROUND_PATH) ? @imagecreatefrompng(self::BACKGROUND_PATH) : false;

        if ($image instanceof GdImage) {
            imagesavealpha($image, true);

            return $image;
        }

        $canvas = imagecreatetruecolor(self::WIDTH, self::HEIGHT);
        imagefilledrectangle($canvas, 0, 0, self::WIDTH, self::HEIGHT, imagecolorallocate($canvas, 22, 26, 36));

        return $canvas;
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

    private function text(GdImage $canvas, int $size, int $x, int $y, int $color, string $text): void
    {
        if ($text === '') {
            return;
        }

        imagettftext($canvas, $size, 0, $x, $y, $color, $this->fontPath, $text);
    }

    /**
     * Draws text twice with a 1px horizontal offset to fake a bold weight —
     * the bundled font ships in a single (regular) weight only.
     */
    private function boldText(GdImage $canvas, int $size, int $x, int $y, int $color, string $text): void
    {
        $this->text($canvas, $size, $x, $y, $color, $text);
        $this->text($canvas, $size, $x + 1, $y, $color, $text);
    }

    /**
     * Draws text horizontally centered on $centerX.
     */
    private function centeredText(GdImage $canvas, int $size, float $centerX, int $y, int $color, string $text): void
    {
        if ($text === '') {
            return;
        }

        $bbox  = imagettfbbox($size, 0, $this->fontPath, $text);
        $width = $bbox[2] - $bbox[0];

        $this->text($canvas, $size, (int) round($centerX - $width / 2), $y, $color, $text);
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
}
