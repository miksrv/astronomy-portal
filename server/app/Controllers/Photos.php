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

// TODO: Раскоментировать проверку прав доступа
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

        try {
            $locale = $this->request->getLocale();
            $object = $this->request->getGet('object');

            // Fetch data from models
            $photosModel  = new PhotosModel();
            $filtersModel = new PhotosFiltersModel();

            $filtersData  = $filtersModel->findAll();
            $photosData   = $object
                ? $photosModel->getPhotosByObjects($object, $locale)
                : $photosModel->getPhotos($locale);

            // Prepare photos with filters and statistics
            $result = prepareObjectDataWithFilters($photosData, $filtersData);

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
     * Photo item by name and date (optional).
     * If there are more than 2 photos with the same object (name) and no date is used,
     * this function will return the newest photo.
     * @param null $id
     * @param null $date
     * @return ResponseInterface
     */
    public function show($id = null, $date = null): ResponseInterface
    {
        helper('filters');

        try {
            $locale = $this->request->getLocale();

            $photosModel  = new PhotosModel();
            $filtersModel = new PhotosFiltersModel();
            $photosData   = $photosModel->getPhotos($locale, $id);
            $filtersData  = $filtersModel->findAll();

            // Prepare photos with filters and statistics
            $result = prepareObjectDataWithFilters($photosData, $filtersData);

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
     * Download photo as file
     * @param $id
     * @param $date
     * @return ResponseInterface
     */
    public function download($id = null, $date = null): ResponseInterface {
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
     * Create new photo item.
     * First, use the photo upload function, which returns the data of the uploaded image.
     * @param null $id
     * @return ResponseInterface
     */
    public function create(): ResponseInterface
    {
        // Get the uploaded file and post data
        $fileUpload = $this->request->getFile('upload');
        $photoData  = $this->request->getPost();

        // Set validation rules
        $rules = [
            'date'       => 'required|valid_date[Y-m-d]',
            'categories' => 'required|string',
            'objects'    => 'required|string',
            'equipment'  => 'required|string',
            'filters'    => 'required|string'
        ];

        // Validate input data
        $this->validator = \Config\Services::validation()->setRules($rules);
        if (!$this->validator->run($photoData)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        // Additional access check
        // if ($this->session?->user?->role !== 'admin') {
        //     return $this->failForbidden('Access Denied');
        // }

        // Decode JSON fields
        $photoData['categories'] = json_decode($photoData['categories'], true);
        $photoData['objects']    = json_decode($photoData['objects'], true);
        $photoData['equipments'] = json_decode($photoData['equipments'], true);
        $photoData['filters']    = json_decode($photoData['filters'], true);

        // Validate the decoded fields (ensure arrays)
        if (!is_array($photoData['categories']) || !is_array($photoData['objects']) ||
            !is_array($photoData['equipments']) || !is_array($photoData['filters'])) {
            return $this->failValidationErrors('Invalid format for categories, objects, equipment, or filters');
        }

        $photoUploadLibrary = new PhotoUploadLibrary();

        // Вызов метода для загрузки файла
        if ($fileUpload && $fileUpload->isValid()) {
            $uploadResult = $photoUploadLibrary->handleFileUpload(
                $fileUpload,
                $photoData['objects'],
                $photoData['date']
            );
        } else {
            return $this->failValidationErrors('File upload failed or invalid file');
        }

        // Insert into database
        try {
            $photosModel = new PhotosModel();

            // Сохраняем фотографию
            $photo = new \App\Entities\PhotoEntity();
            $photo->id           = uniqid();
            $photo->date         = $photoData['date'];
            $photo->dirName      = $uploadResult['dir_name'];
            $photo->file_name    = $uploadResult['file_name'];
            $photo->file_ext     = $uploadResult['file_ext'];
            $photo->file_size    = $uploadResult['file_size'];
            $photo->image_width  = $uploadResult['image_width'];
            $photo->image_height = $uploadResult['image_height'];

            $insertedPhoto = $photosModel->insert($photo);

            // Сохраняем категории
            if (!empty($photoData['categories'])) {
                $photosCategoryModel = new PhotosCategoryModel();

                foreach ($photoData['categories'] as $categoryId) {
                    $photosCategoryModel->insert([
                        'photo_id'    => $photo->id,
                        'category_id' => $categoryId,
                    ]);
                }
            }

            // Сохраняем объекты
            if (!empty($photoData['objects'])) {
                $photosObjectModel = new PhotosObjectModel();

                foreach ($photoData['objects'] as $objectId) {
                    $photosObjectModel->insert([
                        'photo_id'  => $photo->id,
                        'object_id' => $objectId,
                    ]);
                }
            }

            // Сохраняем оборудование
            if (!empty($photoData['equipments'])) {
                $photosEquipmentsModel = new PhotosEquipmentsModel();

                foreach ($photoData['equipments'] as $equipmentId) {
                    $photosEquipmentsModel->insert([
                        'photo_id'     => $photo->id,
                        'equipment_id' => $equipmentId,
                    ]);
                }
            }

            // Сохраняем фильтры
            if (!empty($photoData['filters'])) {
                $photosFiltersModel = new PhotosFiltersModel();

                foreach ($photoData['filters'] as $filterType => $filterData) {
                    if (empty($filterData['exposure']) || empty($filterData['frames'])) {
                        continue;
                    }

                    $photosFiltersModel->insert([
                        'photo_id'      => $photo->id,
                        'filter'        => $filterType,
                        'exposure_time' => $filterData['exposure'],
                        'frames_count'  => $filterData['frames']
                    ]);
                }
            }

            return $this->respondCreated($photoData);
        } catch (\Exception $e) {
            log_message('error', $e->getMessage());
            return $this->failServerError('Could not save photo data');
        }
    }

    /**
     * Uploads a new photo, create a thumbnail and return the data of the uploaded photo.
     * @return ResponseInterface
     */
    public function upload(): ResponseInterface {
        $rules = [
            'image' => 'uploaded[image]|is_image[image]|mime_in[image,image/jpg,image/jpeg,image/gif,image/png,image/webp]'
        ];

        if (!$this->validate($rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        if ($this->session?->user?->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        $img = $this->request->getFile('image');

        if (!$img->hasMoved()) {

            if (!is_dir(UPLOAD_TEMP)) {
                mkdir(UPLOAD_TEMP,0777, TRUE);
            }

            $newName = $img->getRandomName();
            $img->move(UPLOAD_TEMP, $newName);

            $file = new File(UPLOAD_TEMP . $newName);
            $name = pathinfo($file, PATHINFO_FILENAME);

            $image = Services::image('gd'); // imagick
            $image->withFile($file->getRealPath())
                ->fit(700, 500, 'center')
                ->save(UPLOAD_TEMP . $name . '_thumb.' . $file->getExtension());

            return $this->respondCreated([
                'image_name' => $name,
                'image_ext'  => $file->getExtension(),
                'image_size' => $file->getSize(),
            ]);
        }

        return $this->failServerError();
    }

    /**
     * Update exist photo item
     * @param null $id
     * @return ResponseInterface
     */
    public function update($id = null): ResponseInterface {
        $input = $this->request->getJSON(true);
        $rules = [
            'object'    => 'required|alpha_dash|min_length[3]|max_length[40]',
            'date'      => 'required|string|valid_date[Y-m-d]',
            'author_id' => 'numeric'
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        if ($this->session?->user?->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        try {
            $photoModel = new PhotosModel();
            $photoData  = $photoModel->find($id);

            if ($photoData) {
                $input['filters'] = isset($input['filters']) ? json_encode($input['filters']) : null;

                $photoModel->update($id, $input);
                return $this->respondUpdated($input);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }
    }

    /**
     * Soft delete photo item
     * @param null $id
     * @return ResponseInterface
     */
    public function delete($id = null): ResponseInterface {
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
}
