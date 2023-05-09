<?php namespace App\Libraries;

use App\Models\CatalogModel;
use App\Models\FilesModel;

class CatalogLibrary
{
    protected array $filterEnum = [
        'Luminance' => 'luminance',
        'Red'       => 'red',
        'Green'     => 'green',
        'Blue'      => 'blue',
        'Ha'        => 'hydrogen',
        'OIII'      => 'oxygen',
        'SII'       => 'sulfur',
        'CLEAR'     => 'clear'
    ];

    function getCatalogItemByName(string $objectName)
    {
        $modelCatalog = new CatalogModel();
        $modelFiles   = new FilesModel();

        $filesItems  = $modelFiles->findByObject($objectName);
        $catalogItem = $modelCatalog
            ->select('catalog.*, category.name as category_name')
            ->join('category', 'category.id = catalog.category', 'left')
            ->find($objectName);

        if (!$catalogItem) return null;

        $objectStatistic = $this->_getObjectStatistic($filesItems);

        $catalogItem->updated   = $objectStatistic->lastUpdatedDate ?? null;
        $catalogItem->statistic = $objectStatistic->objectStatistic ?? [];
        $catalogItem->filters   = $objectStatistic->filterStatistic ?? [];
        $catalogItem->files     = $this->_mapFilesFilters($filesItems);

        unset($catalogItem->created_at, $catalogItem->updated_at, $catalogItem->deleted_at);

        return $catalogItem;
    }

    function getCatalogList(): ?array
    {
        $modelCatalog = new CatalogModel();
        $modelFiles   = new FilesModel();

        $catalogList = $modelCatalog->findAll();
        $filesList   = $modelFiles->select(['object', 'filter', 'date_obs', 'exptime'])->findAll();

        if (!$catalogList) return null;

        foreach ($catalogList as $item)
        {
            $objectStatistic = $this->_getObjectStatistic($filesList, $item->name);

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
            $file->preview = file_exists(FCPATH . 'uploads/' . $file->object . '/' . $file->file_name . '.jpg');
        }

        return $files;
    }

    protected function _getObjectStatistic(
        array $filesItems,
        string $object = null
    ): ?object
    {
        if (!$filesItems)
            return null;

        $lastUpdatedDate = '';
        $filterStatistic = (object) [];
        $objectStatistic = (object) [
            'frames'    => 0,
            'data_size' => 0,
            'exposure'  => 0
        ];

        foreach ($filesItems as $file)
        {
            if ($object && $object !== $file->object)
                continue;

            if (!$lastUpdatedDate) {
                $lastUpdatedDate = $file->date_obs;
            } else {
                $lastUpdatedDate = max($lastUpdatedDate, $file->date_obs);
            }

            $filterName = $this->filterEnum[$file->filter] ?? 'unknown';

            $objectStatistic->frames   += 1;
            $objectStatistic->exposure += $file->exptime;

            if (isset($filterStatistic->{$filterName}))
            {
                $filterStatistic->{$filterName}->exposure += $file->exptime;
                $filterStatistic->{$filterName}->frames   += 1;
            }
            else
            {
                $filterStatistic->{$filterName} = (object) [
                    'exposure' => $file->exptime,
                    'frames'   => 1
                ];
            }
        }

        $objectStatistic->data_size = round($objectStatistic->frames * FITS_FILE_SIZE);

        return (object) [
            'filterStatistic' => $filterStatistic,
            'objectStatistic' => $objectStatistic,
            'lastUpdatedDate' => $lastUpdatedDate
        ];
    }
}