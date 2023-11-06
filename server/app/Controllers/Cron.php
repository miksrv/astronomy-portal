<?php namespace App\Controllers;

use App\Libraries\BlogLibrary;
use App\Models\PhotoModel;
use CodeIgniter\Files\File;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use ReflectionException;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, PATCH');
header('Access-Control-Allow-Headers: X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization');

if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
    die();
}

class Cron extends ResourceController {
    use ResponseTrait;

    /**
     * @return void
     * @throws ReflectionException
     */
    public function update_telegram_posts() {
        // Опрашиваем канал в новостями с самого начала
        $blogLibrary = new BlogLibrary();

        /* Получение новостей с самой первой новости
        $blogLibrary->getTelegramChannelHistory(
            'nearspace',
            20,
            -20,
            $blogLibrary->getMaxTelegramNews() // 9 - min telegram post
            // 9
        );
        */

        // Обновление последних записей
        $blogLibrary->getTelegramChannelHistory(
            'nearspace',
            80
        );
    }

    /**
     * This method was needed after migrating and changing directories.
     * The method creates another 80x18px preview for the astrophoto, gets the image sizes and writes them to the database.
     * Restart is not needed, because after uploading new photos - all previews will be created automatically
     * @throws ReflectionException
     */
    public function optimize_photos() {
        $photoModel = new PhotoModel();
        $photoData  = $photoModel->findAll();

        if (empty($photoData)) {
            return;
        }

        foreach ($photoData as $photo) {
            $photoPath  = UPLOAD_PHOTOS . $photo->image_name . '.' . $photo->image_ext;
            $photo88x18 = $photo->image_name . '_80x18.' . $photo->image_ext;
            $photoFile  = new File($photoPath);

            if (empty($photo->image_size)) {
                list($width, $height) = getimagesize($photoFile);

                $update = [
                    'image_size'   => $photoFile->getSize(),
                    'image_width'  => $width,
                    'image_height' => $height
                ];

                $photoModel->update($photo->id, $update);

                log_message('notice', "Update photo parameters for ID: {$photo->id}");
            }

            if (file_exists(UPLOAD_PHOTOS . $photo88x18)) {
                continue;
            }

            $image = Services::image('gd'); // imagick
            $image->withFile($photoPath)
                ->fit(160, 36, 'center')
                ->save(UPLOAD_PHOTOS . $photo88x18);

            log_message('notice', "Create 88x18 photo preview for ID: {$photo->id}");
        }
    }
}