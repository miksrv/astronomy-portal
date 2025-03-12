<?php

namespace App\Models;

use App\Entities\PhotoEntity;

class PhotosModel extends ApplicationBaseModel
{
    protected $table      = 'photos';
    protected $primaryKey = 'id';
    protected $returnType = PhotoEntity::class;
    protected $useSoftDeletes = true;

    protected $allowedFields = [
        'id',
        'date',
        'author_id',
        'dir_name',
        'file_name',
        'file_ext',
        'file_size',
        'image_width',
        'image_height',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $validationRules = [
        'dir_name'     => 'required|max_length[100]',
        'file_name'    => 'required|max_length[50]',
        'file_ext'     => 'required|max_length[5]',
        'file_size'    => 'integer',
        'image_width'  => 'integer',
        'image_height' => 'integer',
    ];

    protected $validationMessages = [
        'file_name' => [
            'required'   => 'The file name is required.',
            'max_length' => 'The file name cannot exceed 50 characters.',
        ],
        'file_ext' => [
            'required'   => 'The file extension is required.',
            'max_length' => 'The file extension cannot exceed 5 characters.',
        ],
        'file_size' => [
            'integer' => 'File size must be an integer.',
        ],
        'image_width' => [
            'integer' => 'Image width must be an integer.',
        ],
        'image_height' => [
            'integer' => 'Image height must be an integer.',
        ],
    ];

    protected $skipValidation       = true;
    protected $cleanValidationRules = true;

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    protected array $casts = [
        'file_size'    => 'integer',
        'image_width'  => 'integer',
        'image_height' => 'integer',
        'created_at'   => 'datetime',
        'updated_at'   => 'datetime',
        'deleted_at'   => '?datetime',
    ];

    // ID Генерируется в контроллере при создании новой фото
    // protected $allowCallbacks = false;
    // protected $beforeInsert   = ['generateId'];

     // Основной метод для получения фотографий и связанных данных
    /**
     * Retrieves a list of photos with their localized titles and associated categories.
     *
     * @param string $locale The locale used for selecting the language ('ru' or 'en').
     * @param string|null $photo_id Optional ID to filter a specific photo.
     * @param string|null $object Optional object to filter photos by.
     * @param int|null $limit Optional limit for the number of photos to retrieve. Default is null.
     * @param string|null $order Optional order for retrieving photos ('rand' for random, 'date' for date order). Default is null.
     * @return array An array of photos with associated categories and objects.
     */
    protected function fetchPhotos(
        string $locale = 'ru',
        ?string $photo_id = null,
        ?string $object = null,
        ?int $limit = null,
        ?string $order = null
    ): array
    {
        // Base query
        $photosQuery = $this->select('*');

        // Retrieve related categories and objects
        $photoCategoryModel   = new PhotosCategoryModel();
        $photoObjectsModel    = new PhotosObjectModel();
        $photoEquipmentsModel = new PhotosEquipmentsModel();

        $photoCategoryQuery = $photoCategoryModel->select('photo_id, category_id');
        $photoObjectsQuery  = $photoObjectsModel->select('photo_id, object_id');

        if ($photo_id !== null) {
            $photoCategoryQuery->where('photo_id', $photo_id);
            $photoObjectsQuery->where('photo_id', $photo_id);
            $photosQuery->where('id', $photo_id);
        }

        if ($object !== null) {
            $photoObjectsQuery->where('object_id', $object);
        }

        $photosCategories = $photoCategoryQuery->findAll();
        $photosObjects    = $photoObjectsQuery->findAll();
        $photosEquipments = $photo_id !== null
            ? $photoEquipmentsModel->where('photo_id', $photo_id)->findAll()
            : [];

        if ($object !== null) {
            if (empty($photosObjects)) {
                return [];
            }

            $photosIds = array_map(fn($photo) => $photo->photo_id, $photosObjects);
            $photosQuery->whereIn('id', $photosIds);
        }

        if (is_numeric($limit) && $limit > 0) {
            $photosQuery->limit($limit);
        }

        if ($order !== null && in_array($order, ['rand', 'date'])) {
            $photosQuery->orderBy($order === 'rand' ? 'RAND()' : 'created_at');
        }

        $photosList = $photosQuery->findAll();

        if (empty($photosList)) {
            return [];
        }

        // Map categories and objects
        foreach ($photosList as $photoItem) {
            $photoItem->categories = array_values(array_map(
                fn($category) => $category->category_id,
                array_filter($photosCategories, fn($category) => $category->photo_id === $photoItem->id)
            ));

            $photoItem->objects = array_values(array_map(
                fn($objects) => $objects->object_id,
                array_filter($photosObjects, fn($objects) => $objects->photo_id === $photoItem->id)
            ));

            if ($photo_id !== null && count($photosEquipments)) {
                $photoItem->equipments = array_values(array_map(
                    fn($equipments) => $equipments->equipment_id,
                    array_filter($photosEquipments, fn($equipments) => $equipments->photo_id === $photoItem->id)
                ));
            }

            unset(
                $photoItem->file_size,
                $photoItem->image_width, $photoItem->image_height,
                $photoItem->deleted_at, $photoItem->created_at
            );
        }

        return $photosList;
    }

    /**
     * Retrieves a list of photos with optional filtering by photo ID.
     *
     * @param string $locale The locale used for selecting the language ('ru' or 'en'). Default is 'ru'.
     * @param string|null $photo_id Optional photo ID to filter a specific photo. Default is null.
     * @param int|null $limit Optional limit for the number of photos to retrieve. Default is null.
     * @param string|null $order Optional order for retrieving photos ('rand' for random, 'date' for date order). Default is null.
     * @return array An array of photos with their localized titles and associated categories.
     */
    public function getPhotosList(
        string $locale = 'ru',
        ?string $photo_id = null,
        ?int $limit = null,
        ?string $order = null
    ): array
    {
        return $this->fetchPhotos($locale, $photo_id, null, $limit, $order);
    }

    /**
     * Retrieves a list of photos filtered by a specific object.
     *
     * @param string $object The object to filter photos by.
     * @param string $locale The locale used for selecting the language ('ru' or 'en'). Default is 'ru'.
     * @param int|null $limit Optional limit for the number of photos to retrieve. Default is null.
     * @param string|null $order Optional order for retrieving photos ('rand' for random, 'date' for date order). Default is null.
     * @return array An array of photos filtered by the specified object, with their localized titles and associated categories.
     */
    public function getPhotosListByObjects(
        string $object,
        string $locale = 'ru',
        ?int $limit = null,
        ?string $order = null
    ): array
    {
        return $this->fetchPhotos($locale, null, $object, $limit, $order);
    }
}
