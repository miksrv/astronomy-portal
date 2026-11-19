<?php

namespace App\Libraries;

use CodeIgniter\HTTP\Files\UploadedFile;
use Config\Services;
use RuntimeException;

/**
 * The cover of an event: `UPLOAD_EVENTS/{id}/cover-<random>.webp` and its 585×400 preview
 * `cover-<random>_preview.webp`. Whatever is uploaded (JPEG, PNG, WebP, GIF) is stored as WebP — a
 * poster PNG of 1.5 MB becomes a few hundred KB — and never wider than `MAX_WIDTH`.
 *
 * Every cover gets a new name: a replaced cover has a new address, so the image optimizer and the
 * browsers, which keep an image for its address (30 days), show the new one at once. The files of
 * the earlier cover are removed once the event points at the new one, so a folder holds one cover.
 *
 * `toWebp()` converts a cover stored before (the one-time `events:covers-webp`).
 */
class EventCoverLibrary
{
    /** The start of every cover's file name: `cover-<random>` (`cover` for the ones stored before) */
    public const NAME = 'cover';
    public const EXT  = 'webp';

    /** The site shows a cover at most this wide (the event page on a large screen) */
    public const MAX_WIDTH = 1920;

    /** WebP quality: posters with text stay sharp, photos lose nothing visible */
    public const QUALITY = 85;

    public const PREVIEW_WIDTH  = 585;
    public const PREVIEW_HEIGHT = 400;

    private const SOURCE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    public function __construct(private readonly string $root = UPLOAD_EVENTS)
    {
    }

    /**
     * Stores an uploaded file as the event's cover. The files of the earlier one stay until the
     * event points at the new one: the caller removes them then (removeOtherCovers()).
     *
     * @return array{name: string, ext: string} The values of `cover_file_name` / `cover_file_ext`.
     */
    public function store(UploadedFile $file, string $eventId): array
    {
        $directory = $this->directory($eventId);
        $source    = 'upload-' . bin2hex(random_bytes(4)) . '.' . ($file->getExtension() ?: 'img');

        $file->move($directory, $source, true);

        try {
            $name = $this->write($directory . '/' . $source, $directory);
        } finally {
            @unlink($directory . '/' . $source);
        }

        return ['name' => $name, 'ext' => self::EXT];
    }

    /**
     * Converts a cover stored in another format to WebP (a new name), the preview too.
     *
     * @return array{name: string, before: int, after: int} The new `cover_file_name`, the bytes of
     *     the cover + preview before and after.
     */
    public function toWebp(string $eventId, string $name, string $ext): array
    {
        $directory = $this->root . $eventId;
        $source    = $directory . '/' . $name . '.' . $ext;

        if (!is_file($source)) {
            throw new RuntimeException("No cover file {$source}");
        }

        $before = filesize($source) + (int) @filesize($directory . '/' . $name . '_preview.' . $ext);

        // Written next to the old files: if the conversion fails, nothing is lost. The old files
        // are removed by the caller (removeOtherCovers()) once the event points at the new ones
        $newName = $this->write($source, $directory);

        return [
            'name'   => $newName,
            'before' => $before,
            'after'  => filesize($directory . '/' . $newName . '.' . self::EXT) + filesize($directory . '/' . $newName . '_preview.' . self::EXT),
        ];
    }

    /**
     * Removes every cover file of the event (any format, its preview too) but the cover `$keep`:
     * called once the event points at it.
     */
    public function removeOtherCovers(string $eventId, string $keep): void
    {
        $directory = $this->root . $eventId;
        $kept      = [$keep . '.' . self::EXT, $keep . '_preview.' . self::EXT];

        foreach (glob($directory . '/' . self::NAME . '*') ?: [] as $file) {
            $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));

            if (is_file($file) && in_array($extension, self::SOURCE_EXTENSIONS, true) && !in_array(basename($file), $kept, true)) {
                unlink($file);
            }
        }
    }

    /**
     * The cover and its preview from a source image, as WebP under a new name.
     *
     * @return string The new name (without the extension).
     */
    private function write(string $source, string $directory): string
    {
        $name    = self::NAME . '-' . bin2hex(random_bytes(4));
        $target  = $directory . '/' . $name . '.' . self::EXT;
        $preview = $directory . '/' . $name . '_preview.' . self::EXT;

        // GD drops the EXIF orientation: a portrait phone photo is turned upright first
        $image = Services::image('gd', null, false)->withFile($source)->reorient(true);

        if ($image->getWidth() > self::MAX_WIDTH) {
            $image->resize(self::MAX_WIDTH, self::MAX_WIDTH, true, 'width');
        }

        $image->convert(IMAGETYPE_WEBP)->save($target, self::QUALITY);

        Services::image('gd', null, false)
            ->withFile($target)
            ->fit(self::PREVIEW_WIDTH, self::PREVIEW_HEIGHT, 'center')
            ->convert(IMAGETYPE_WEBP)
            ->save($preview, self::QUALITY);

        return $name;
    }

    private function directory(string $eventId): string
    {
        $directory = $this->root . $eventId;

        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        return $directory;
    }
}
