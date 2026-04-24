<?php

namespace App\Models;

use App\Entities\ObjectEntity;

/**
 * ObjectsModel
 *
 * Manages the `objects` table for the astronomical objects catalog. The primary
 * key is a string `catalog_name` (e.g. 'M31') rather than a numeric ID. Supports
 * soft deletes, bilingual title/description fields, and validation rules for the
 * required coordinate fields ra and dec.
 */
class ObjectsModel extends ApplicationBaseModel
{
    protected $table            = 'objects';
    protected $primaryKey       = 'catalog_name';
    protected $useAutoIncrement = false;
    protected $returnType       = ObjectEntity::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

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

    // Dates
    protected $useTimestamps = true;
    protected $createdField       = 'created_at';
    protected $updatedField       = 'updated_at';
    protected $deletedField       = 'deleted_at';

    // Validation
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

    /** @var array<string, string> CI4 model-level casts for RA/Dec coordinate fields. */
    protected array $casts = [
        'ra'  => 'float',
        'dec' => 'float',
    ];

    /**
     * Retrieves all objects (or a single object) with localised titles and associated category IDs.
     *
     * When $object is provided only that catalog entry is returned; otherwise all objects are
     * returned. Each result has a single localised `title` field (and `description` /
     * `fitsCloudLink` when fetching a single object), plus a `categories` array of category IDs.
     *
     * @param string      $locale Locale code for title/description selection ('ru' or 'en'). Default is 'ru'.
     * @param string|null $object Optional catalog_name to retrieve a single object.
     * @return array Array of ObjectEntity objects enriched with localised fields and categories.
     */
    public function getObjectsWithCategories(string $locale = 'ru', string $object = null): array
    {
        helper('locale');

        $objectsQuery = $this->select('catalog_name, title_en, title_ru, image_file, ra, dec' . (
            $object !== null ? ', description_en, description_ru, fits_cloud_link' : '')
        );

        if ($object !== null) {
            $objectsQuery->where('catalog_name', $object);
        }

        $objects = $objectsQuery->findAll();

        if (empty($objects)) {
            return [];
        }

        $objectCategoryModel = new ObjectCategoryModel();
        $objectCategoryQuery = $objectCategoryModel->select('object_name, category_id');

        if ($object !== null) {
            $objectCategoryQuery->where('objects_categories.object_name', $object);
        }

        $objectsCategories = $objectCategoryQuery->findAll();

        foreach ($objects as $objectItem) {
            $objectItem->name  = $objectItem->catalog_name;
            $objectItem->title = getLocalizedString($locale, $objectItem->title_en, $objectItem->title_ru);

            if ($object !== null) {
                $objectItem->description   = getLocalizedString($locale, $objectItem->description_en, $objectItem->description_ru);
                $objectItem->fitsCloudLink = $objectItem->fits_cloud_link;
            }

            if (!empty($objectItem->image_file) && file_exists(UPLOAD_STAR_MAPS . $objectItem->image_file)) {
                $imageFile     = explode('.', $objectItem->image_file);
                $objectItem->image = PATH_STAR_MAPS . $imageFile[0] . '.' . $imageFile[1];
            }

            $objectItem->categories = array_values(array_map(
                fn($category) => $category->category_id,
                array_filter($objectsCategories, fn($category) => $category->object_name === $objectItem->catalog_name)
            ));

            unset(
                $objectItem->catalog_name, $objectItem->title_en, $objectItem->title_ru,
                $objectItem->description_en, $objectItem->description_ru,
                $objectItem->image_file, $objectItem->fits_cloud_link
            );
        }

        return $objects;
    }
}
