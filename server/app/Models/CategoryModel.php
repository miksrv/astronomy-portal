<?php

namespace App\Models;

use App\Entities\CategoryEntity;

/**
 * CategoryModel
 *
 * Manages the `categories` table, which stores shared photo and object categories
 * with bilingual (EN/RU) titles and descriptions.
 */
class CategoryModel extends ApplicationBaseModel
{
    protected $table            = 'categories';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = CategoryEntity::class;
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'title_en',
        'title_ru',
        'description_en',
        'description_ru',
    ];

    // Dates
    protected $useTimestamps = false;

    /**
     * Retrieves all categories with titles and descriptions localised to the given locale.
     *
     * Removes the unused-language columns from each result object so the API
     * response contains only a single `title` and `description` field.
     *
     * @param string $locale Locale code used for field selection ('ru' or 'en'). Default is 'ru'.
     * @return array Array of CategoryEntity objects with localised title and description.
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
