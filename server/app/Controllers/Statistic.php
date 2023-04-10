<?php namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class Statistic extends ResourceController
{
    use ResponseTrait;

    /**
     * List of statistic summary data
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        return $this->respond([]);
    }
}