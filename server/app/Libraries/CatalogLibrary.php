<?php namespace App\Libraries;

use App\Models\CatalogModel;
use App\Models\FilesModel;

class CatalogLibrary
{
    protected StatisticLibrary $libraryStatistic;

    function __construct() {
        $this->libraryStatistic = new StatisticLibrary();
    }

    /**
     * @param string $objectName
     * @return array|object|null
     */
    public function getCatalogItemByName(string $objectName)
    {
        $modelCatalog = new CatalogModel();
        $modelFiles   = new FilesModel();

        $filesItems  = $modelFiles->findByObject($objectName);
        $catalogItem = $modelCatalog
            ->select('catalog.*, category.name as category_name')
            ->join('category', 'category.id = catalog.category', 'left')
            ->find($objectName);

        if (!$catalogItem) {
            return null;
        }

        $objectStatistic = $this->libraryStatistic->getObjectStatistic($filesItems);

        $catalogItem->updated   = $objectStatistic->lastUpdatedDate ?? null;
        $catalogItem->statistic = $objectStatistic->objectStatistic ?? [];
        $catalogItem->filters   = $objectStatistic->filterStatistic ?? [];
        $catalogItem->files     = $this->mappingFilesToFilters($filesItems);

        unset($catalogItem->created_at, $catalogItem->updated_at, $catalogItem->deleted_at);

        return $catalogItem;
    }

    /**
     * @return array|null
     */
    public function getCatalogList(): ?array
    {
        helper('text');

        $modelCatalog = new CatalogModel();
        $modelFiles   = new FilesModel();

        $catalogList = $modelCatalog->findAll();
        $filesList   = $modelFiles->select(['object', 'filter', 'date_obs', 'exptime'])->findAll();

        if (!$catalogList) {
            return null;
        }

        foreach ($catalogList as $item) {
            $objectStatistic = $this->libraryStatistic->getObjectStatistic($filesList, $item->name);

            $item->text      = word_limiter($item->text, 25, '...');
            $item->updated   = $objectStatistic->lastUpdatedDate;
            $item->statistic = $objectStatistic->objectStatistic;
            $item->filters   = $objectStatistic->filterStatistic;

            unset($item->created_at, $item->updated_at, $item->deleted_at);
        }

        return $catalogList;
    }

    /**
     * @param array $files
     * @return array
     */
    protected function mappingFilesToFilters(array $files): array
    {
        foreach ($files as $file) {
            $file->filter  = $this->libraryStatistic->mappingFilesFilters($file->filter);
            $file->preview = file_exists(UPLOAD_FITS . $file->object . '/' . $file->file_name . '.jpg');
        }

        return $files;
    }
}
