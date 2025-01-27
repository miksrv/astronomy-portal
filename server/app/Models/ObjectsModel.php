<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Entities\ObjectEntity;

class ObjectsModel extends Model
{
    protected $table      = 'objects';
    protected $primaryKey = 'catalog_name';
    protected $returnType = ObjectEntity::class;
    protected $useSoftDeletes = true;

    protected $allowedFields = [
        'catalog_name',
        'title_en',
        'title_ru',
        'description_en',
        'description_ru',
        'fits_cloud_link',
        'image_file',
        'ra',
        'dec',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $validationRules = [
        'catalog_name' => 'required|max_length[255]|is_unique[objects.catalog_name]',
        'title_en'     => 'required|max_length[255]',
        'title_ru'     => 'required|max_length[255]',
        'ra'           => 'required|decimal',
        'dec'          => 'required|decimal',
    ];

    protected $validationMessages = [
        'catalog_name' => [
            'required'   => 'Catalog name is required.',
            'max_length' => 'Catalog name cannot exceed 255 characters.',
            'is_unique'  => 'This Object Name already exists.',
        ],
        'title_en' => [
            'required'   => 'English title is required.',
            'max_length' => 'English title cannot exceed 255 characters.',
        ],
        'title_ru' => [
            'required'   => 'Russian title is required.',
            'max_length' => 'Russian title cannot exceed 255 characters.',
        ],
        'ra' => [
            'required' => 'RA value is required.',
            'decimal'  => 'RA must be a decimal value.',
        ],
        'dec' => [
            'required' => 'Dec value is required.',
            'decimal'  => 'Dec must be a decimal value.',
        ],
    ];

    protected array $casts = [
        'ra'  => 'float',
        'dec' => 'float'
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    /**
     * Retrieves a list of objects with their localized titles and associated categories.
     *
     * @param string $locale The locale used for selecting the language ('ru' or 'en').
     * @param string|null $object Optional catalog name to filter the specific object.
     * @return array An array of objects, each containing localized titles and associated categories.
     */
    public function getObjectsWithCategories(string $locale = 'ru', string $object = null): array
    {
        helper('locale');

        // Prepare base query to retrieve objects with their titles in both languages
        $objectsQuery = $this->select('catalog_name, title_en, title_ru, image_file, ra, dec' . (
            $object !== null ? ', description_en, description_ru, fits_cloud_link' : '')
        );

        // Apply filter if a specific object is requested
        if ($object !== null) {
            $objectsQuery->where('catalog_name', $object);
        }

        $objects = $objectsQuery->findAll();

        if (empty($objects)) {
            return [];
        }

        // Prepare base query to retrieve object-category relationships with localized category titles
        $objectCategoryModel = new ObjectCategoryModel();
        $objectCategoryQuery = $objectCategoryModel->select('object_name, category_id');

        // Filter by object name if specified
        if ($object !== null) {
            $objectCategoryQuery->where('objects_categories.object_name', $object);
        }

        $objectsCategories = $objectCategoryQuery->findAll();

        // Map each object with localized titles and its associated categories
        foreach ($objects as $objectItem) {
            $objectItem->name  = $objectItem->catalog_name;
            $objectItem->title = getLocalizedString($locale, $objectItem->title_en, $objectItem->title_ru);

            if ($object !== null) {
                $objectItem->description   = getLocalizedString($locale, $objectItem->description_en, $objectItem->description_ru);
                $objectItem->fitsCloudLink = $objectItem->fits_cloud_link;
            }

            // Add object star map image file if available
            if (!empty($objectItem->image_file) && file_exists(UPLOAD_STAR_MAPS . $objectItem->image_file)) {
               $imageFile = explode('.', $objectItem->image_file);
               $objectItem->image = PATH_STAR_MAPS . $imageFile[0] . '.' . $imageFile[1];
            }

            // Filter and map categories belonging to the object with localized titles
            $objectItem->categories = array_values(array_map(
                fn($category) => $category->category_id,
                array_filter($objectsCategories, fn($category) => $category->object_name === $objectItem->catalog_name)
            ));

            // Remove unnecessary fields
            unset(
                $objectItem->catalog_name, $objectItem->title_en, $objectItem->title_ru,
                $objectItem->description_en, $objectItem->description_ru,
                $objectItem->image_file, $objectItem->fits_cloud_link
            );
        }

        return $objects;
    }
}
