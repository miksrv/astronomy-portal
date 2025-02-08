<?php

namespace App\Controllers;

use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Models\ObjectsModel;
use App\Models\ObjectFitsFiltersModel;
use App\Models\ObjectCategoryModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use Exception;

// TODO: Добавить локали для всех мотодов в этом классе
// TODO: $objectsModel вынести в $this->model, в конструктор класса
// TODO: Исправить |is_unique[objects.catalog_name,catalog_name,{id}] для метода update
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
        helper('filters');

        try {
            $locale = $this->request->getLocale();

            // Fetch data from models
            $objectsModel = new ObjectsModel();
            $filtersModel = new ObjectFitsFiltersModel();
            $objectsData  = $objectsModel->getObjectsWithCategories($locale);
            $filtersData  = $filtersModel->findAll();

            // Prepare objects with filters and statistics
            $result = prepareObjectDataWithFilters($objectsData, $filtersData);

            // Return the response with count and items
            return $this->respond([
                'count' => count($result),
                'items' => $result
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
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
        helper('filters');

        try {
            $locale = $this->request->getLocale();

            // Fetch data from models
            $objectsModel = new ObjectsModel();
            $filtersModel = new ObjectFitsFiltersModel();
            $objectsData  = $objectsModel->getObjectsWithCategories($locale, $id);
            $filtersData  = $filtersModel->findAll();

            // Prepare the object data with filters and statistics
            $result = prepareObjectDataWithFilters($objectsData, $filtersData);

            if (!empty($result)) {
                return $this->respond($result[0]);
            }

            return $this->failValidationErrors(lang('Objects.notFound'));
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * Create a new object item.
     *
     * @return ResponseInterface Returns a response indicating the result of the creation operation.
     */
    public function create(): ResponseInterface
    {
        if ($this->session?->user?->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        $input = $this->request->getJSON(true);
        $rules = [
            'name'  => 'required|min_length[3]|max_length[40]|is_unique[objects.catalog_name]',
            'image' => 'string',
        ];

        if (!$this->validate($rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        // if ($this->session?->user?->role !== 'admin') {
        //     return $this->failValidationErrors('Ошибка прав доступа');
        // }

        try {
            $objectsModel = new ObjectsModel();
            $objectsModel->insert($input);

            return $this->respondCreated($input);
        } catch (Exception $e) {
            log_message('error', $e->getMessage(), ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * Update an existing object.
     *
     * @param string|null $id The ID of the object to update.
     * @return ResponseInterface Returns a response indicating the result of the update operation.
     */
    public function update($id = null): ResponseInterface
    {
        if ($this->session?->user?->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        $input = $this->request->getJSON(true);
        $rules = [
            'name'  => 'required|min_length[3]|max_length[40]', // |is_unique[objects.catalog_name,catalog_name,{id}]
            'image' => 'string',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        // if ($this->session?->user?->role !== 'admin') {
        //     return $this->failValidationErrors('Ошибка прав доступа');
        // }

        // Validate the decoded fields (ensure arrays)
        if ((!empty($input) && !is_array($input['categories'])) || (!empty($input['equipment']) && !is_array($input['equipment']))) {
            return $this->failValidationErrors('Invalid format for categories, objects, equipment, or filters');
        }

        // Save the catalog image
        if (!empty($input['image'])) {
            $input['image_file'] = $this->_saveCatalogImage($id, $input['image']);
            unset($input['image']);
        }

        try {
            $objectsModel = new ObjectsModel();
            $objectsData  = $objectsModel->where('catalog_name', $id)->first();

            // Сохраняем категории
            if (!empty($input['categories'])) {
                $objectCategoryModel = new ObjectCategoryModel();
                $objectCategoryModel->where('object_name', $id)->delete();

                foreach ($input['categories'] as $categoryId) {
                    $objectCategoryModel->insert([
                        'object_name' => $id,
                        'category_id' => $categoryId,
                    ]);
                }
            }

            if ($objectsData) {
                $objectsModel->update($id, $input);
                return $this->respondUpdated($input);
            }

            return $this->failNotFound('Объект не найден');
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('Внутренняя ошибка сервера');
        }
    }

    /**
     * Hard delete an object item by ID.
     *
     * @param string|null $id The ID of the object to delete.
     * @return ResponseInterface Returns a response indicating the result of the delete operation.
     */
    public function delete($id = null): ResponseInterface
    {
        if ($this->session?->user?->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        try {
            $objectsModel = new ObjectsModel();
            $objectsData  = $objectsModel->where('catalog_name', $id)->first();

            if (!$objectsData) {
                return $this->failNotFound();
            }

            $objectsModel->delete($id, true);
            return $this->respondDeleted($objectsData);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError();
        }
    }

    /**
     * Saves a catalog image from a base64 encoded string.
     *
     * @param string $name The name of the catalog image.
     * @param string $imageString The base64 encoded image string.
     * @return string|null The file name of the saved image or null on failure.
     */
    protected function _saveCatalogImage(string $name, string $imageString): ?string {
        $fileName = $name . '.png';

        if (empty($imageString))
            return null;

        try {
            if (!is_dir(UPLOAD_STAR_MAPS))
            {
                mkdir(UPLOAD_STAR_MAPS,0777, TRUE);
            }

            $imageString = str_replace('data:image/png;base64,', '', $imageString);
            $imageString = str_replace(' ', '+', $imageString);
            $imageString = base64_decode($imageString);

            helper('filesystem');
            write_file(UPLOAD_STAR_MAPS . $fileName, $imageString);

            return $fileName;
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return null;
        }
    }
}
