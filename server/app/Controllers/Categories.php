<?php

namespace App\Controllers;

use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Models\CategoryModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use Exception;

/**
 * Class Categories
 * @package App\Controllers
 *
 * @method ResponseInterface list() Retrieves a list of categories
 */
class Categories extends ResourceController
{
    use ResponseTrait;

    private SessionLibrary $session;

    public function __construct()
    {
        LocaleLibrary::init();

        $this->session = new SessionLibrary();
    }

    /**
     * Retrieves a list of categories
     *
     * @return ResponseInterface Returns a response containing the categories list.
     */
    public function list(): ResponseInterface
    {
        try {
            $locale   = $this->request->getLocale();
            $cache    = \Config\Services::cache();
            $cacheKey = 'categories_list_' . $locale;
            $cached   = $cache->get($cacheKey);

            if ($cached !== null) {
                return $this->respond($cached);
            }

            // Fetch data from models
            $categoriesModel = new CategoryModel();
            $categoriesData  = $categoriesModel->getCategories($locale);

            $response = [
                'count' => count($categoriesData),
                'items' => $categoriesData,
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
