<?php

namespace App\Commands;

use App\Models\PhotosModel;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Config\Services;

/**
 * Generates the square `_thumb` preview (160×160) for photos uploaded before 4.15.0, when
 * the catalog started showing square thumbnails. New uploads get it from PhotoUploadLibrary.
 *
 * ```bash
 * php spark photos:thumbnails          # only photos that have no _thumb yet
 * php spark photos:thumbnails --force  # regenerate every one
 * ```
 */
class GeneratePhotoThumbnails extends BaseCommand
{
    protected $group       = 'Observatory';
    protected $name        = 'photos:thumbnails';
    protected $description = 'Generate the square catalog thumbnail for every photo that lacks one';
    protected $options     = ['--force' => 'Regenerate thumbnails that already exist'];

    public function run(array $params): void
    {
        $force  = CLI::getOption('force') !== null;
        $photos = (new PhotosModel())->findAll();
        $image  = Services::image('gd');
        $done   = 0;
        $missed = 0;
        $failed = 0;

        foreach ($photos as $photo) {
            $base   = UPLOAD_PHOTOS . $photo->dir_name . '/' . $photo->file_name;
            $source = $base . '_large.' . $photo->file_ext;
            $target = $base . '_thumb.' . $photo->file_ext;

            if (!file_exists($source)) {
                $missed++;
                continue;
            }

            if (file_exists($target) && !$force) {
                continue;
            }

            try {
                $image->withFile($source)->fit(160, 160, 'center')->save($target);
                $done++;
            } catch (\Throwable $e) {
                // A corrupt or unreadable file: report it and carry on with the rest
                $failed++;
                CLI::error("{$photo->id}: {$e->getMessage()}");
            }
        }

        CLI::write(
            "Thumbnails generated: {$done}"
            . ($missed ? ", photos without a large file: {$missed}" : '')
            . ($failed ? ", failed: {$failed}" : ''),
            $failed ? 'yellow' : 'green'
        );
    }
}
