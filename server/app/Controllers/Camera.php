<?php

namespace App\Controllers;

use CodeIgniter\Exceptions\PageNotFoundException;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class Camera extends ResourceController
{
    use ResponseTrait;

    const CACHE_TIME = 5;

    /**
     * Camera image by id
     * @param null $id
     * @return ResponseInterface
     */
    public function show($id = null): ResponseInterface
    {
        $param = getenv('app.observatory.webcam_' . $id);
        $cache = 'webcam_' . $id;

        if (!$param) {
            throw PageNotFoundException::forPageNotFound();
        }

        if ( ! $photo = cache($cache)) {
            try {
                $photo = file_get_contents($param);
            } catch (\Exception $e) {
                $photo = file_get_contents(FCPATH . '/images/camera_offline.png');
            }

            cache()->save($cache, $photo, self::CACHE_TIME);
        }

        return $this->response->setHeader('Content-Type', 'image/jpeg')->setBody($photo)->send();
    }
}