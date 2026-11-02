<?php

namespace App\Controllers;

use CodeIgniter\Exceptions\PageNotFoundException;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Class Camera
 * @package App\Controllers
 *
 * @method ResponseInterface show($id = null) Camera image by id
 */
class Camera extends BaseApiController
{
    const CACHE_TIME = 2;

    /** How long the camera host may take before the offline placeholder is served instead */
    const FETCH_TIMEOUT = 3;

    /** An unreachable camera is re-tried this often, not on every page view */
    const OFFLINE_CACHE_TIME = 30;

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
            // A camera that doesn't answer must not hold the page's other requests: give up fast
            $context = stream_context_create(['http' => ['timeout' => self::FETCH_TIMEOUT]]);
            $photo   = @file_get_contents($param, false, $context);

            if ($photo === false || $photo === '') {
                $photo = file_get_contents(FCPATH . '/images/camera_offline.png');
                cache()->save($cache, $photo, self::OFFLINE_CACHE_TIME);
            } else {
                cache()->save($cache, $photo, self::CACHE_TIME);
            }
        }

        return $this->response->setHeader('Content-Type', 'image/jpeg')->setBody($photo)->send();
    }
}
