<?php namespace App\Libraries;

use App\Models\CatalogModel;
use App\Models\FilesModel;

class CatalogLibrary
{
    function getCatalogItemByName(string $objectName)
    {
        $libraryStatistic = new StatisticLibrary();

        $modelCatalog = new CatalogModel();
        $modelFiles   = new FilesModel();

        $filesItems  = $modelFiles->findByObject($objectName);
        $catalogItem = $modelCatalog
            ->select('catalog.*, category.name as category_name')
            ->join('category', 'category.id = catalog.category', 'left')
            ->find($objectName);

        if (!$catalogItem) return null;

        $objectStatistic = $libraryStatistic->getObjectStatistic($filesItems);

        $catalogItem->updated   = $objectStatistic->lastUpdatedDate ?? null;
        $catalogItem->statistic = $objectStatistic->objectStatistic ?? [];
        $catalogItem->filters   = $objectStatistic->filterStatistic ?? [];
        $catalogItem->files     = $this->_mapFilesFilters($filesItems);

        unset($catalogItem->created_at, $catalogItem->updated_at, $catalogItem->deleted_at);

        return $catalogItem;
    }

    function getCatalogList(): ?array
    {
        helper('text');

        $libraryStatistic = new StatisticLibrary();

        $modelCatalog = new CatalogModel();
        $modelFiles   = new FilesModel();

        $catalogList = $modelCatalog->findAll();
        $filesList   = $modelFiles->select(['object', 'filter', 'date_obs', 'exptime'])->findAll();

        if (!$catalogList) return null;

        foreach ($catalogList as $item)
        {
            $objectStatistic = $libraryStatistic->getObjectStatistic($filesList, $item->name);

            $item->text      = word_limiter($item->text, 25, '...');
            $item->updated   = $objectStatistic->lastUpdatedDate;
            $item->statistic = $objectStatistic->objectStatistic;
            $item->filters   = $objectStatistic->filterStatistic;

            unset($item->created_at, $item->updated_at, $item->deleted_at);
        }

        return $catalogList;
    }

    protected function _mapFilesFilters(array $files): array
    {
        foreach ($files as $file)
        {
            $file->filter  = $this->filterEnum[$file->filter] ?? 'unknown';
            $file->preview = file_exists(UPLOAD_FITS . $file->object . '/' . $file->file_name . '.jpg');
        }

        return $files;
    }
}