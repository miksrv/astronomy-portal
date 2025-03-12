<?php

namespace App\Controllers;

use App\Libraries\LocaleLibrary;
use App\Libraries\PhotosLibrary;
use App\Libraries\SessionLibrary;
use App\Libraries\PhotoUploadLibrary;
use App\Models\CatalogModel;
use App\Models\PhotosModel;
use App\Models\PhotosCategoryModel;
use App\Models\PhotosObjectModel;
use App\Models\PhotosEquipmentsModel;
use App\Models\PhotosFiltersModel;
use CodeIgniter\Files\File;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use Exception;

// TODO: Добавить проверку на существование categories, objects, equipment и filters при создании и редактировании
class Photos extends ResourceController
{
    use ResponseTrait;

    private SessionLibrary $session;

    public function __construct()
    {
        new LocaleLibrary();

        $this->session = new SessionLibrary();
    }

    /**
     * Retrieves a list of photos and their related filters with statistics (frames, exposure).
     *
     * @return ResponseInterface Returns a response containing the photo list with filter statistics.
     */
    public function list(): ResponseInterface
    {
        helper('filters');

        $locale = $this->request->getLocale();
        $limit  = $this->request->getGet('limit', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $order  = $this->request->getGet('order', FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);
        $object = $this->request->getGet('object', FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);

        try {
            // Fetch data from models
            $photosModel  = new PhotosModel();
            $filtersModel = new PhotosFiltersModel();

            $filtersData = $filtersModel->findAll();
            $photosData  = $object
                ? $photosModel->getPhotosListByObjects($object, $locale, $limit, $order)
                : $photosModel->getPhotosList($locale, null, $limit, $order);

            // Prepare photos with filters and statistics
            $result = preparePhotoDataWithFilters($photosData, $filtersData);

            // Return the response with count and items
            return $this->respond([
                'count' => count($photosData),
                'items' => $photosData
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * Retrieves a photo item by name and date (optional).
     * If there are more than 2 photos with the same object (name) and no date is used,
     * this function will return the newest photo.
     *
     * @param null $id The ID of the photo.
     * @param null $date The date of the photo.
     * @return ResponseInterface Returns a response containing the photo item.
     */
    public function show($id = null, $date = null): ResponseInterface
    {
        helper('filters');

        try {
            $locale = $this->request->getLocale();

            $photosModel  = new PhotosModel();
            $filtersModel = new PhotosFiltersModel();
            $photosData   = $photosModel->getPhotosList($locale, $id);
            $filtersData  = $filtersModel->where('photo_id', $id)->findAll();

            // Prepare photos with filters and statistics
            $result = preparePhotoDataWithFilters($photosData, $filtersData);

            if ($photosData) {
                return $this->respond($result[0]);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * Downloads a photo as a file.
     *
     * @param $id The ID of the photo.
     * @param $date The date of the photo.
     * @return ResponseInterface Returns a response to download the photo file.
     */
    public function download($id = null, $date = null): ResponseInterface
    {
        try {
            $photoModel = new PhotosModel();
            $photoData  = $photoModel
                ->select('image_name, image_ext')
                ->where(['object' => $id, 'date' => $date])
                ->first();

            $photoLink  = UPLOAD_PHOTOS .  $photoData->image_name . '.' . $photoData->image_ext;

            if ($photoData && file_exists($photoLink)) {
                return $this->response->download($photoLink, null);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failNotFound();
        }
    }

    /**
     * Creates a new photo item.
     * First, uses the photo upload function, which returns the data of the uploaded image.
     *
     * @return ResponseInterface Returns a response indicating the creation status.
     */
    public function create(): ResponseInterface
    {
        return $this->save();
    }

    /**
     * Updates an existing photo item.
     * If the list of objects or the date changes when saving the photo,
     * the directory and files need to be renamed or the change should be prohibited during editing.
     *
     * @param null $id The ID of the photo.
     * @return ResponseInterface Returns a response indicating the update status.
     */
    public function update($id = null): ResponseInterface
    {
        return $this->save($id);
    }

    /**
     * Uploads a new photo, creates a thumbnail, and returns the data of the uploaded photo.
     * If the extension of the old file differs from the extension of the new one, the old photo is not deleted.
     *
     * @param null $id The ID of the photo.
     * @return ResponseInterface Returns a response indicating the upload status.
     */
    public function upload($id = null): ResponseInterface
    {
        $fileUpload = $this->request->getFile('file');

        if (!$fileUpload || !$fileUpload->isValid()) {
            return $this->failValidationErrors('File upload failed or invalid file');
        }

        $photoUploadLibrary = new PhotoUploadLibrary();
        $photosObjectModel  = new PhotosObjectModel();
        $photosModel  = new PhotosModel();
        $photoData    = $photosModel->find($id);
        $photoObjects = $photosObjectModel->where('photo_id', $id)->findAll();

        if (!$photoData || !$photoObjects) {
            return $this->failValidationErrors('Invalid photo ID');
        }

        $photo = new \App\Entities\PhotoEntity();
        $objectsIds = array_map(fn($object) => $object->object_id, $photoObjects);

        try {
            if ($photoData->fileName && $photoData->fileExt) {
                $photoFullName = $photoData->fileName . '.' . $photoData->fileExt;
                $photoUploadLibrary->handleFileDelete($objectsIds, $photoFullName);
            }

            $uploadResult = $photoUploadLibrary->handleFileUpload(
                $fileUpload,
                $objectsIds,
                $photoData->date
            );

            $photo->fill($uploadResult);
            $photosModel->update($id, $photo);

            return $this->respondCreated($photo);
        } catch (\Exception $e) {
            log_message('error', $e->getMessage());
            return $this->failServerError('Could not save photo data');
        }
    }

    /**
     * Soft deletes a photo item.
     *
     * @param null $id The ID of the photo.
     * @return ResponseInterface Returns a response indicating the deletion status.
     */
    public function delete($id = null): ResponseInterface
    {
        if ($this->session?->user?->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        try {
            $photoModel = new PhotosModel();
            $photoData  = $photoModel->find($id);

            if ($photoData) {
                $photoModel->delete($id);
                return $this->respondDeleted($photoData);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }
    }

    /**
     * Saves a photo item. This method is used for both creating and updating photo items.
     *
     * @param null $id The ID of the photo.
     * @return ResponseInterface Returns a response indicating the save status.
     */
    protected function save($id = null)
    {
        if ($this->session?->user?->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        // Get the uploaded file and post data
        $input = $this->request->getJSON(true);

        // Set validation rules
        $rules = [
            'date'       => 'required|valid_date[Y-m-d]',
            'categories' => 'required',
            'objects'    => 'required',
            'equipments' => 'required',
            'filters'    => 'required'
        ];

        // Validate input data
        $this->validator = \Config\Services::validation()->setRules($rules);
        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        // Additional access check
        // if ($this->session?->user?->role !== 'admin') {
        //     return $this->failForbidden('Access Denied');
        // }

        // Validate the decoded fields (ensure arrays)
        if (!is_array($input['categories']) || !is_array($input['objects']) ||
            !is_array($input['equipments']) || !is_array($input['filters'])) {
            return $this->failValidationErrors('Invalid format for categories, objects, equipment, or filters');
        }

        // Insert into database
        try {
            $photosModel = new PhotosModel();

            // Сохраняем фотографию
            $photo = new \App\Entities\PhotoEntity();
            $photo->id   = $id ?? uniqid();
            $photo->date = $input['date'];

            if (!$id) {
                $photosModel->insert($photo);
            } else {
                $photosModel->update($id, $photo);
            }

            // Сохраняем категории
            if (!empty($input['categories'])) {
                $photosCategoryModel = new PhotosCategoryModel();
                $photosCategoryModel->where('photo_id', $photo->id)->delete();

                foreach ($input['categories'] as $categoryId) {
                    $photosCategoryModel->insert([
                        'photo_id'    => $photo->id,
                        'category_id' => $categoryId,
                    ]);
                }
            }

            // Сохраняем объекты
            if (!empty($input['objects'])) {
                $photosObjectModel = new PhotosObjectModel();
                $photosObjectModel->where('photo_id', $photo->id)->delete();

                foreach ($input['objects'] as $objectId) {
                    $photosObjectModel->insert([
                        'photo_id'  => $photo->id,
                        'object_id' => $objectId,
                    ]);
                }
            }

            // Сохраняем оборудование
            if (!empty($input['equipments'])) {
                $photosEquipmentsModel = new PhotosEquipmentsModel();
                $photosEquipmentsModel->where('photo_id', $photo->id)->delete();

                foreach ($input['equipments'] as $equipmentId) {
                    $photosEquipmentsModel->insert([
                        'photo_id'     => $photo->id,
                        'equipment_id' => $equipmentId,
                    ]);
                }
            }

            // Сохраняем фильтры
            if (!empty($input['filters'])) {
                $photosFiltersModel = new PhotosFiltersModel();
                $photosFiltersModel->where('photo_id', $photo->id)->delete();

                foreach ($input['filters'] as $filterType => $filterData) {
                    if (empty($filterData['exposure']) || empty($filterData['frames'])) {
                        continue;
                    }

                    $photosFiltersModel->insert([
                        'photo_id'      => $photo->id,
                        'filter'        => $filterType,
                        'exposure_time' => $filterData['exposure'] * 60,
                        'frames_count'  => $filterData['frames']
                    ]);
                }
            }

            return $this->respondCreated($photo);
        } catch (\Exception $e) {
            log_message('error', $e->getMessage());
            return $this->failServerError('Could not save photo data');
        }
    }
}
