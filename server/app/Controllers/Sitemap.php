<?php

namespace App\Controllers;

use App\Models\PhotosModel;
use App\Models\ObjectsModel;
use App\Models\EventsModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;

class Sitemap extends ResourceController
{
    /**
     * @return ResponseInterface
     */
    public function index(): ResponseInterface
    {
        $photosModel  = new PhotosModel();
        $objectsModel = new ObjectsModel();
        $eventsModel  = new EventsModel();

        $photosData = $photosModel->select('id, updated_at')->findAll();
        $eventsData = $eventsModel->select('id, updated_at')->findAll();

        foreach ($photosData as $key => $photo) {
            $photosData[$key] = [
                'id'      => $photo->id,
                'updated' => $photo->updated_at,
            ];
        }

        foreach ($eventsData as $key => $event) {
            $eventsData[$key] = [
                'id'      => $event->id,
                'updated' => $event->updated_at,
            ];
        }

        return $this->respond([
            'photos'  => $photosData,
            'objects' => $objectsModel->select('catalog_name as id, updated_at as updated')->findAll(),
            'events'  => $eventsData,
        ]);
    }
}
