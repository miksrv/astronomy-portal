<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Entities\CategoryEntity;

class CategoryModel extends Model
{
    protected $table      = 'categories';
    protected $primaryKey = 'id';
    protected $returnType = CategoryEntity::class;

    protected $useSoftDeletes = false;

    protected $allowedFields = [
        'title_en',
        'title_ru',
        'description_en',
        'description_ru',
    ];

    protected $useTimestamps = false;

    /**
     * Retrieves a list of categories with localized titles and descriptions.
     *
     * This method fetches all categories from the database and localizes their titles and descriptions
     * based on the provided locale. Unused language fields are removed from the result.
     *
     * @param string $locale The locale used for selecting the language ('ru' or 'en'). Default is 'ru'.
     * 
     * @return array An array of category objects, each containing localized title and description fields.
     */
    public function getCategories(string $locale = 'ru'): array
    {
        helper('locale');

        $categoriesData = $this->findAll();

        if (empty($categoriesData)) {
            return [];
        }

        foreach ($categoriesData as $category) {
            $category->title       = getLocalizedString($locale, $category->title_en, $category->title_ru);
            $category->description = getLocalizedString($locale, $category->description_en, $category->description_ru);

            unset(
                $category->title_en, $category->title_ru, 
                $category->description_en, $category->description_ru
            );
        }

        return $categoriesData;
    }
}
