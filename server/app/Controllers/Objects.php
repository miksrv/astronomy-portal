<?php

namespace App\Controllers;

use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Models\ObjectsModel;
use App\Models\ObjectFitsFiltersModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use Exception;

class Objects extends ResourceController
{
    use ResponseTrait;

    private SessionLibrary $session;

    public function __construct()
    {
        new LocaleLibrary();

        $this->session = new SessionLibrary();
    }

    /**
     * Retrieves a list of objects and their related filters with statistics (frames, exposure, file size).
     *
     * @return ResponseInterface Returns a response containing the object list with filter statistics.
     */
    public function list(): ResponseInterface
    {
        try {
            $locale = $this->request->getLocale();

            // Fetch data from models
            $objectsModel = new ObjectsModel();
            $filtersModel = new ObjectFitsFiltersModel();
            $objectsData  = $objectsModel->getObjectsWithCategories($locale);
            $filtersData  = $filtersModel->findAll();

            // Prepare objects with filters and statistics
            $result = $this->_prepareObjectDataWithFilters($objectsData, $filtersData);

            // Return the response with count and items
            return $this->respond([
                'count' => count($result),
                'items' => $result
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('Objects.serverError'));
        }
    }

    /**
     * Retrieves a specific object by ID along with related filters and statistics.
     *
     * @param string|null $id The ID of the object to retrieve.
     * @return ResponseInterface Returns a response containing the object and its filter statistics.
     */
    public function show($id = null): ResponseInterface
    {
        try {
            $locale = $this->request->getLocale();

            // Fetch data from models
            $objectsModel = new ObjectsModel();
            $filtersModel = new ObjectFitsFiltersModel();
            $objectsData  = $objectsModel->getObjectsWithCategories($locale, $id);
            $filtersData  = $filtersModel->findAll();

            // Prepare the object data with filters and statistics
            $result = $this->_prepareObjectDataWithFilters($objectsData, $filtersData);

            if (!empty($result)) {
                return $this->respond($result[0]);
            } else {
                return $this->failValidationErrors(lang('Objects.notFound'));
            }
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('Objects.serverError'));
        }
    }
    
    /**
     * Create new catalog item
     * @return ResponseInterface
     */
    // public function create(): ResponseInterface {
    //     $input = $this->request->getJSON(true);
    //     $rules = [
    //         'name' => 'required|min_length[3]|max_length[40]|is_unique[category.name]'
    //     ];

    //     if (!$this->validate($rules)) {
    //         return $this->failValidationErrors($this->validator->getErrors());
    //     }

    //     if ($this->session->user->role !== 'admin') {
    //         return $this->failValidationErrors('Ошибка прав доступа');
    //     }

    //     try {
    //         $objectsModel = new CategoryModel();
    //         $objectsModel->insert($input);

    //         return $this->respondCreated($input);
    //     } catch (Exception $e) {
    //         log_message('error', '{exception}', ['exception' => $e]);

    //         return $this->failServerError();
    //     }
    // }

    /**
     * Update exist category item
     * @param null $id
     * @return ResponseInterface
     */
    // public function update($id = null): ResponseInterface {
    //     $input = $this->request->getJSON(true);
    //     $rules = [
    //         'name' => 'required|min_length[3]|max_length[40]|is_unique[category.name]'
    //     ];

    //     $this->validator = Services::Validation()->setRules($rules);

    //     if (!$this->validator->run($input)) {
    //         return $this->failValidationErrors($this->validator->getErrors());
    //     }

    //     if ($this->session->user->role !== 'admin') {
    //         return $this->failValidationErrors('Ошибка прав доступа');
    //     }

    //     try {
    //         $objectsModel = new CategoryModel();
    //         $objectsData  = $objectsModel->find($id);

    //         if ($objectsData) {
    //             $objectsModel->update($id, $input);
    //             return $this->respondUpdated($input);
    //         }

    //         return $this->failNotFound();
    //     } catch (Exception $e) {
    //         log_message('error', '{exception}', ['exception' => $e]);

    //         return $this->failServerError();
    //     }
    // }

    /**
     * Hard delete category item
     * @param string|null $id
     * @return ResponseInterface
     */
    // public function delete($id = null): ResponseInterface {
    //     if ($this->session->user->role !== 'admin') {
    //         return $this->failValidationErrors('Ошибка прав доступа');
    //     }

    //     try {
    //         $objectsModel = new CategoryModel();
    //         $objectsData   = $objectsModel->find($id);

    //         if ($objectsData) {
    //             $objectsModel->delete($id, true);
    //             return $this->respondDeleted($objectsData);
    //         }

    //         return $this->failNotFound();
    //     } catch (Exception $e) {
    //         log_message('error', '{exception}', ['exception' => $e]);

    //         return $this->failServerError();
    //     }
    // }

    /**
     * Helper method to prepare object data with associated filter statistics.
     *
     * @param array $objectsData Array of objects to be processed.
     * @param array $filtersData Array of filters to associate with objects.
     * @return array An array of objects each with associated filter statistics.
     */
    private function _prepareObjectDataWithFilters(array $objectsData, array $filtersData): array
    {
        // Group filters by object_name for faster lookup
        $filtersGroupedByObject = [];
        foreach ($filtersData as $filter) {
            $filtersGroupedByObject[$filter->object_name][] = $filter;
        }

        // Iterate over objects and calculate statistics for related filters
        foreach ($objectsData as $object) {
            $relatedFilters = $filtersGroupedByObject[$object->name] ?? [];

            if (!empty($relatedFilters)) {
                $filterStatistic = [];
                $totalFrames   = 0;
                $totalExposure = 0;
                $totalFileSize = 0;

                // Aggregate statistics for each related filter
                foreach ($relatedFilters as $filter) {
                    $totalFrames   += $filter->frames_count;
                    $totalExposure += $filter->exposure_time;
                    $totalFileSize += $filter->files_size;

                    // Store individual filter statistics
                    $filterStatistic[$filter->filter] = [
                        'frames'   => $filter->frames_count,
                        'exposure' => $filter->exposure_time,
                        'fileSize' => $filter->files_size
                    ];
                }

                // Add filter statistics to the object
                $object->filters   = $filterStatistic;
                $object->statistic = [
                    'frames'   => $totalFrames,
                    'exposure' => $totalExposure,
                    'fileSize' => $totalFileSize
                ];
            }
        }

        return $objectsData;
    }
}