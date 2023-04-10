<?php namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class Relay extends ResourceController
{
    use ResponseTrait;

    /**
     * List of all relay states
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        return $this->respond([]);
    }

    /**
     * Set relay state by ID
     * @param int|null $id
     * @return ResponseInterface
     */
    public function set(int $id = null): ResponseInterface
    {
        return $this->respond([]);
    }
}