<?php

namespace App\Controllers;

use App\Models\ObservatoryEquipmentModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Exception;

class Equipment extends ResourceController
{
    use ResponseTrait;

    /**
     * Retrieves a list of observatory equipment.
     *
     * @return ResponseInterface Returns a response containing the equipment list.
     */
    public function list(): ResponseInterface
    {
        try {

            // Fetch data from models
            $equipmentModel = new ObservatoryEquipmentModel();
            $equipmentData  = $equipmentModel->findAll();

            // Return the response with count and items
            return $this->respond([
                'count' => count($equipmentData),
                'items' => $equipmentData
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }
}