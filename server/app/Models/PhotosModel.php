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
        'file_name',
        'file_ext',
        'file_size',
        'image_width',
        'image_height',
        'equipment_info',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $validationRules = [
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

    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];

    /**
     * Retrieves a list of photos with their localized titles and associated categories.
     *
     * @param string $locale The locale used for selecting the language ('ru' or 'en').
     * @param string|null $photo_id Optional ID to filter the specific photo.
     * @return array An array of photos, each containing localized titles and associated categories.
     */
    public function getPhotosWithCategories(string $locale = 'ru', string $photo_id = null): array
    {
        helper('locale');

        // Prepare base query to retrieve photos with their titles in both languages
        $photosQuery = $this->select('*');

        // Apply filter if a specific object is requested
        if ($photo_id !== null) {
            $photosQuery->where('photo_id', $photo_id);
        }

        $photos = $photosQuery->findAll();

        if (empty($photos)) {
            return [];
        }

        // Prepare base query to retrieve object-category relationships with localized category titles
        $photoCategoryModel = new PhotosCategoryModel();
        $photoObjectsModel  = new PhotosObjectModel();
        $photoCategoryQuery = $photoCategoryModel->select('photo_id, category_id');
        $photoObjectsQuery  = $photoObjectsModel->select('photo_id, object_id');

        // Filter by photo id if specified
        if ($photo_id !== null) {
            $photoCategoryQuery->where('photos_categories.photo_id', $photo_id);
            $photoObjectsQuery->where('photos_objects.photo_id', $photo_id);
        }

        $photosCategories = $photoCategoryQuery->findAll();
        $photosObjects    = $photoObjectsQuery->findAll();

        // Map each photo with associated categories
        foreach ($photos as $photoItem) {
            // Filter and map categories belonging to the object with localized titles
            $photoItem->categories = array_values(array_map(
                fn($category) => $category->category_id,
                array_filter($photosCategories, fn($category) => $category->photo_id === $photoItem->id)
            ));

            $photoItem->objects = array_values(array_map(
                fn($objects) => $objects->object_id,
                array_filter($photosObjects, fn($objects) => $objects->photo_id === $photoItem->id)
            ));

            // Remove unnecessary fields
            unset(
                $photoItem->file_name, $photoItem->file_ext, $photoItem->file_size,
                $photoItem->image_width, $photoItem->image_height,
                $photoItem->deleted_at, $photoItem->created_at
            );
        }

        return $photos;
    }
}
