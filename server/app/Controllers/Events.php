<?php namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;

class Events extends ResourceController {
    public function list(): ResponseInterface {
        return $this->respond();
    }

    public function show($id = null): ResponseInterface {
        return $this->respond();
    }

    public function create(): ResponseInterface {
        return $this->respond();
    }

    public function update($id = null): ResponseInterface {
        return $this->respond();
    }

    public function upload($id = null): ResponseInterface {
        return $this->respond();
    }
}
