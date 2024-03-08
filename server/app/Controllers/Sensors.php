<?php namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class Sensors extends ResourceController {
    use ResponseTrait;

    public function list(): ResponseInterface
    {
        return $this->respond();
    }
}