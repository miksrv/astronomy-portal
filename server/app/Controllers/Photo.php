<?php namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\PhotoModel;
use Exception;

class Photo extends ResourceController
{
    use ResponseTrait;

    /**
     * List of all photos
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        $model = new PhotoModel();

        return $this->respond(['items' => $model->findAll()]);
    }

    /**
     * Photo item by name
     * @param string $name
     * @return ResponseInterface
     */
    public function item(string $name): ResponseInterface
    {
        try {
            $model = new PhotoModel();

            return $this->respond(['items' => $model->find($name)]);
        } catch (Exception $e) {
            return $this->failNotFound();
        }
    }

    /**
     * Create new photo item
     * @param string $name
     * @return ResponseInterface
     */
    public function create(string $name): ResponseInterface
    {
        return $this->respond([]);
    }

    /**
     * Upload photo image for photo item by name
     * @param string $name
     * @return ResponseInterface
     */
    public function upload(string $name): ResponseInterface
    {
        return $this->respond([]);
    }

    /**
     * Update exist photo item
     * @param string $name
     * @return ResponseInterface
     */
    public function update(string $name): ResponseInterface
    {
        return $this->respond([]);
    }

    /**
     * Soft delete photo item
     * @param string $name
     * @return ResponseInterface
     */
    public function delete(string $name): ResponseInterface
    {
        return $this->respond([]);
    }
}