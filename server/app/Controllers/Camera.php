<?php namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class Camera extends ResourceController
{
    use ResponseTrait;

    /**
     * Camera image by id
     * @return ResponseInterface
     */
    public function item(): ResponseInterface
    {
        return $this->respond([]);
    }
}