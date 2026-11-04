<?php

namespace App\Controllers;

use App\Enums\Permission;
use App\Libraries\LocaleLibrary;
use App\Libraries\ObjectSimbadLibrary;
use App\Libraries\SimbadClient;
use App\Libraries\SessionLibrary;
use App\Models\ObjectsModel;
use App\Models\ObjectFitsFiltersModel;
use App\Models\ObjectCategoryModel;
use App\Models\ObjectFitsFilesModel;
use App\Models\PhotosObjectModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\I18n\Time;
use Config\Services;
use Exception;

// TODO: Добавить локали для всех мотодов в этом классе
// TODO: $objectsModel вынести в $this->model, в конструктор класса
// TODO: Исправить |is_unique[objects.catalog_name,catalog_name,{id}] для метода update
class Objects extends BaseApiController
{
    private SessionLibrary $session;

    public function __construct()
    {
        LocaleLibrary::init();

        $this->session = new SessionLibrary();
    }

    /**
     * Retrieves a list of objects and their related filters with statistics (frames, exposure, file size),
     * plus what the catalog shows per object: the cover photo (the newest one), the number of photos,
     * and the number of observing nights with the first and the last of them.
     *
     * @return ResponseInterface Returns a response containing the object list with filter statistics.
     */
    public function list(): ResponseInterface
    {
        helper('filters');

        try {
            $locale   = $this->request->getLocale();
            $cache    = \Config\Services::cache();
            $cacheKey = 'objects_list_' . $locale;
            $cached   = $cache->get($cacheKey);

            if ($cached !== null) {
                return $this->respond($cached);
            }

            // Fetch data from models
            $objectsModel = new ObjectsModel();
            $filtersModel = new ObjectFitsFiltersModel();
            $objectsData  = $objectsModel->getObjectsWithCategories($locale);
            $objectNames  = array_column($objectsData, 'name');
            $filtersData  = empty($objectNames) ? [] : $filtersModel->whereIn('object_name', $objectNames)->findAll();

            // Prepare objects with filters and statistics
            $result = prepareObjectDataWithFilters($objectsData, $filtersData);
            $nights = (new ObjectFitsFilesModel())->getNightsSummary();
            $covers = (new PhotosObjectModel())->getObjectCovers();

            foreach ($result as $object) {
                $this->_addNights($object, $nights[$object->name] ?? null);

                $object->photosCount = $covers[$object->name]['photosCount'] ?? 0;

                if (isset($covers[$object->name])) {
                    $object->cover = $covers[$object->name]['cover'];
                }
            }

            $response = [
                'count' => count($result),
                'items' => $result,
            ];

            $cache->save($cacheKey, $response, 300);

            // Return the response with count and items
            return $this->respond($response);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
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

            if (empty($objectsData)) {
                return $this->respondNotFound(lang('Objects.notFound'));
            }

            $filtersData = $filtersModel->where('object_name', $id)->findAll();

            // Prepare the object data with filters and statistics
            $result = prepareObjectDataWithFilters($objectsData, $filtersData);
            $nights = (new ObjectFitsFilesModel())->getNightsSummary($id);

            if (!empty($result)) {
                $this->_addNights($result[0], $nights[$id] ?? null);
                $result[0]->optics = (new ObjectFitsFilesModel())->getObjectOptics($id);

                return $this->respond($result[0]);
            }

            return $this->respondNotFound(lang('Objects.notFound'));
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
        }
    }

    /**
     * Looks a name up in SIMBAD for the object form ("Найти в SIMBAD"), without storing anything:
     * the editor sees what was found and saves it with the form.
     */
    public function simbad($name = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::OBJECTS_MANAGE)) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        $name = trim(urldecode((string) $name));

        if ($name === '' || mb_strlen($name) > 80) {
            return $this->respondInvalidRequest('SIMBAD lookup without a name');
        }

        try {
            $simbad = (new SimbadClient(8))->lookup($name);
        } catch (\Throwable $e) {
            log_message('warning', 'SIMBAD lookup of {name} failed: {message}', ['name' => $name, 'message' => $e->getMessage()]);

            return $this->respondError(lang('Objects.simbadUnavailable'), 503);
        }

        if ($simbad === null) {
            return $this->respondNotFound(lang('Objects.simbadNotFound'));
        }

        $simbad['magnitude'] = ObjectSimbadLibrary::ownMagnitude($simbad['type'], $simbad['magnitude']);

        return $this->respond($simbad);
    }

    /**
     * Create a new object item.
     *
     * @return ResponseInterface Returns a response indicating the result of the creation operation.
     */
    public function create(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::OBJECTS_MANAGE)) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        $input = $this->request->getJSON(true);
        $rules = [
            'name'          => 'required|min_length[3]|max_length[40]',
            'image'         => 'if_exist|permit_empty|string',
            'title'         => 'if_exist|permit_empty|string|max_length[255]',
            'description'   => 'if_exist|permit_empty|string',
            'ra'            => 'if_exist|permit_empty|decimal',
            'dec'           => 'if_exist|permit_empty|decimal',
            'distance'      => 'if_exist|permit_empty|decimal|greater_than[0]',
            'magnitude'     => 'if_exist|permit_empty|decimal|greater_than_equal_to[-30]|less_than_equal_to[30]',
            'fitsCloudLink' => 'if_exist|permit_empty|string|max_length[500]',
        ];

        if (!$this->validate($rules)) {
            return $this->respondValidationErrors($this->validator->getErrors());
        }

        // Map 'name' input field to 'catalog_name' DB column
        $input['catalog_name'] = $input['name'] ?? '';
        unset($input['name']);

        // Map frontend field names to DB column names
        if (isset($input['title'])) {
            $input['title_ru'] = $input['title'];
            $input['title_en'] = $input['title'];
            unset($input['title']);
        }
        if (isset($input['description'])) {
            $input['description_ru'] = $input['description'];
            $input['description_en'] = $input['description'];
            unset($input['description']);
        }
        if (isset($input['fitsCloudLink'])) {
            $input['fits_cloud_link'] = $input['fitsCloudLink'];
            unset($input['fitsCloudLink']);
        }

        // An emptied optional fact clears the column instead of storing 0
        foreach (['distance', 'magnitude'] as $field) {
            if (array_key_exists($field, $input) && ($input[$field] === '' || $input[$field] === null)) {
                $input[$field] = null;
            }
        }

        // Save the catalog image
        if (!empty($input['image'])) {
            $input['image_file'] = $this->_saveCatalogImage($input['catalog_name'], $input['image']);
        }
        unset($input['image']);

        // What the editor looked up in SIMBAD from the form; without it the object is looked up below
        $simbad = ObjectSimbadLibrary::columnsFromForm($input['simbad'] ?? null, Time::now('UTC')->toDateTimeString());
        unset($input['simbad']);

        if ($simbad) {
            $input += $simbad;
        }

        // Check uniqueness after mapping
        $objectsModel = new ObjectsModel();
        if ($objectsModel->where('catalog_name', $input['catalog_name'])->withDeleted()->first()) {
            return $this->respondValidationErrors(['name' => lang('Objects.nameAlreadyExists')], null, 409);
        }

        $categories = is_array($input['categories'] ?? null) ? array_map('intval', $input['categories']) : [];

        try {
            $objectsModel->insert($input);

            $objectCategoryModel = new ObjectCategoryModel();

            foreach ($categories as $categoryId) {
                $objectCategoryModel->insert([
                    'object_name' => $input['catalog_name'],
                    'category_id' => $categoryId,
                ]);
            }

            if (!$simbad) {
                $this->_fillFromSimbad($input, $categories);
            }

            \Config\Services::cache()->deleteMatching('objects_list_*');

            $input['name'] = $input['catalog_name'];

            return $this->respondCreated($input);
        } catch (Exception $e) {
            log_message('error', $e->getMessage(), ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
        }
    }

    /**
     * Fills a new object from SIMBAD (type, size, aliases; the magnitude when empty). A failed or
     * slow lookup never fails the create: `objects:simbad` picks the object up later.
     */
    private function _fillFromSimbad(array $object, array $categories): void
    {
        // Tests never reach out to CDS
        if (ENVIRONMENT === 'testing') {
            return;
        }

        try {
            $result = (new ObjectSimbadLibrary(new SimbadClient(8)))->check($object, $categories);

            if ($result['update']) {
                (new ObjectsModel())->update($object['catalog_name'], $result['update']);
            }

            if ($result['status'] === 'far') {
                log_message('warning', 'SIMBAD: {name} resolves {offset}° away from its coordinates, not filled', [
                    'name'   => $object['catalog_name'],
                    'offset' => round($result['offset'], 1),
                ]);
            }
        } catch (\Throwable $e) {
            log_message('warning', 'SIMBAD lookup of {name} failed: {message}', [
                'name'    => $object['catalog_name'],
                'message' => $e->getMessage(),
            ]);
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
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::OBJECTS_MANAGE)) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        $input = $this->request->getJSON(true);
        $rules = [
            'name'          => 'required|min_length[3]|max_length[40]', // |is_unique[objects.catalog_name,catalog_name,{id}]
            'image'         => 'if_exist|permit_empty|string',
            'title'         => 'if_exist|permit_empty|string|max_length[255]',
            'description'   => 'if_exist|permit_empty|string',
            'ra'            => 'if_exist|permit_empty|decimal',
            'dec'           => 'if_exist|permit_empty|decimal',
            'distance'      => 'if_exist|permit_empty|decimal|greater_than[0]',
            'magnitude'     => 'if_exist|permit_empty|decimal|greater_than_equal_to[-30]|less_than_equal_to[30]',
            'fitsCloudLink' => 'if_exist|permit_empty|string|max_length[500]',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->respondValidationErrors($this->validator->getErrors());
        }

        // Validate the decoded fields (ensure arrays)
        if ((!empty($input) && !is_array($input['categories'])) || (!empty($input['equipment']) && !is_array($input['equipment']))) {
            return $this->respondError(lang('General.invalidDataFormat'), 400);
        }

        // Map frontend field names to DB column names
        if (isset($input['title'])) {
            $input['title_ru'] = $input['title'];
            $input['title_en'] = $input['title'];
            unset($input['title']);
        }
        if (isset($input['description'])) {
            $input['description_ru'] = $input['description'];
            $input['description_en'] = $input['description'];
            unset($input['description']);
        }
        if (isset($input['fitsCloudLink'])) {
            $input['fits_cloud_link'] = $input['fitsCloudLink'];
            unset($input['fitsCloudLink']);
        }

        // An emptied optional fact clears the column instead of storing 0
        foreach (['distance', 'magnitude'] as $field) {
            if (array_key_exists($field, $input) && ($input[$field] === '' || $input[$field] === null)) {
                $input[$field] = null;
            }
        }

        // Save the catalog image
        if (!empty($input['image'])) {
            $input['image_file'] = $this->_saveCatalogImage($id, $input['image']);
            unset($input['image']);
        }

        // The editor refreshed the object from SIMBAD in the form
        $simbad = ObjectSimbadLibrary::columnsFromForm($input['simbad'] ?? null, Time::now('UTC')->toDateTimeString());
        unset($input['simbad']);

        if ($simbad) {
            $input += $simbad;
        }

        try {
            $objectsModel = new ObjectsModel();
            $objectsData  = $objectsModel->where('catalog_name', $id)->first();

            if (!$objectsData) {
                return $this->respondNotFound(lang('App.objectNotFound'));
            }

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

            $objectsModel->update($id, $input);

            \Config\Services::cache()->deleteMatching('objects_list_*');

            return $this->respondUpdated($input);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->respondServerError(lang('General.serverError'));
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
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::OBJECTS_MANAGE)) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        try {
            $objectsModel = new ObjectsModel();
            $objectsData  = $objectsModel->where('catalog_name', $id)->first();

            if (!$objectsData) {
                return $this->respondNotFound();
            }

            $objectsModel->delete($id, true);

            \Config\Services::cache()->deleteMatching('objects_list_*');

            return $this->respondDeleted($objectsData);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->respondServerError();
        }
    }

    /**
     * Adds the observing nights summary (`nights`, `firstNight`, `lastNight`) to an object.
     *
     * @param object     $object  The object entity from getObjectsWithCategories().
     * @param array|null $summary The object's entry from ObjectFitsFilesModel::getNightsSummary().
     */
    protected function _addNights(object $object, ?array $summary): void
    {
        $object->nights = $summary['nights'] ?? 0;

        if (!empty($summary['firstNight'])) {
            $object->firstNight = $summary['firstNight'];
            $object->lastNight  = $summary['lastNight'];
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
