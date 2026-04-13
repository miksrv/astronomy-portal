<?php

namespace App\Controllers;

use App\Models\ObservatoryEquipmentModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Exception;

/**
 * Class Equipment
 *
 * This controller handles the retrieval of observatory equipment data.
 *
 * @package App\Controllers
 */
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
            $cache    = \Config\Services::cache();
            $cacheKey = 'equipment_list';
            $cached   = $cache->get($cacheKey);

            if ($cached !== null) {
                return $this->respond($cached);
            }

            // Fetch data from models
            $equipmentModel = new ObservatoryEquipmentModel();
            $equipmentData  = $equipmentModel->findAll();

            $response = [
                'count' => count($equipmentData),
                'items' => $equipmentData,
            ];

            $cache->save($cacheKey, $response, 300);

            // Return the response with count and items
            return $this->respond($response);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }
}
