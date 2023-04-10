<?php namespace App\Libraries;

use App\Models\CatalogModel;
use App\Models\FilesModel;

// FIT file size in byte for 16 bit mask (Mb)
defined('FITS_FILE_SIZE') || define('FITS_FILE_SIZE', 32.78592);

class CatalogLibrary
{
    protected array $filterEnum = [
        'Luminance' => 'luminance',
        'Red'       => 'red',
        'Green'     => 'green',
        'Blue'      => 'green',
        'Ha'        => 'hydrogen',
        'OIII'      => 'oxygen',
        'SII'       => 'sulfur',
        'CLEAR'     => 'clear'
    ];

    function getCatalogItemByName(string $objectName)
    {
        $modelCatalog = new CatalogModel();
        $modelFiles   = new FilesModel();

        $catalogItem = $modelCatalog->find($objectName);
        $filesItems  = $modelFiles->findByObject($objectName);

        if (!$catalogItem) return null;

        $objectStatistic = $this->_getObjectStatistic($filesItems);

        $catalogItem->statistic = $objectStatistic->objectStatistic ?? [];
        $catalogItem->filters   = $objectStatistic->filterStatistic ?? [];
        $catalogItem->files     = $filesItems;

        unset($catalogItem->created_at, $catalogItem->updated_at, $catalogItem->deleted_at);

        return $catalogItem;
    }

    function getCatalogList(): ?array
    {
        $modelCatalog = new CatalogModel();
        $modelFiles   = new FilesModel();

        $catalogItem = $modelCatalog->findAll();
        $filesItems  = $modelFiles->select(['object', 'filter', 'date_obs', 'exptime', 'object'])->findAll();

        if (!$catalogItem) return null;

        foreach ($catalogItem as $item)
        {
            $objectStatistic = $this->_getObjectStatistic($filesItems, $item->name);

            $item->statistic = $objectStatistic->objectStatistic;
            $item->filters   = $objectStatistic->filterStatistic;

            unset($item->created_at, $item->updated_at, $item->deleted_at);
        }

        return $catalogItem;
    }

    protected function _getObjectStatistic(
        array $filesItems,
        string $object = null
    ): ?object
    {
        if (!$filesItems)
            return null;

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
            'objectStatistic' => $objectStatistic
        ];
    }
}