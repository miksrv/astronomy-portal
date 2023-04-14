<?php namespace App\Libraries;

use App\Models\CatalogModel;
use App\Models\FilesModel;
use App\Models\PhotoModel;

class PhotosLibrary
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

    /**
     * @param string $objectName
     * @param string|null $date
     * @return array|object|null
     */
    function getPhotoByObject(string $objectName, string $date = null)
    {
        $where = ['object' => $objectName];

        if ($date)
        {
            $where['date'] = $date;
        }

        $modelPhoto = new PhotoModel();
        $filesModel = new FilesModel();
        $photoItem  = $modelPhoto
            ->where($where)
            ->orderBy('date', 'DESC')
            ->first();

        unset($photoItem->created_at, $photoItem->updated_at, $photoItem->deleted_at);

        $filesItem = $filesModel->where(['object' => $objectName])->findAll();
        $statistic = $this->_getPhotoStatistic($filesItem, $photoItem->date);

        $photoItem->statistic = $statistic->objectStatistic;
        $photoItem->filters   = $statistic->filterStatistic;

        return $photoItem;
    }

    /**
     * @param string|null $filterObject
     * @return array|null
     */
    function getPhotoList(string $filterObject = null, int $filterLimit = 0): ?array
    {
        $modelPhoto = new PhotoModel();
        $modelFiles = new FilesModel();
        $modelPhoto->orderBy('date', 'DESC');
        $modelFiles->select(['object', 'filter', 'date_obs', 'exptime']);

        if ($filterObject)
        {
            $modelPhoto->where(['object' => $filterObject]);
            $modelFiles->where(['object' => $filterObject]);
        }

        $photoList = $modelPhoto->findAll($filterLimit);
        $filesList = $modelFiles->findAll();

        if (!$photoList) return null;

        foreach ($photoList as $photo)
        {
            $objectStatistic = $this->_getPhotoStatistic($filesList, $photo->date, $photo->object);

            $photo->statistic = $objectStatistic->objectStatistic;
            $photo->filters   = $objectStatistic->filterStatistic;

            unset($photo->created_at, $photo->updated_at, $photo->deleted_at);
        }

        return $photoList;
    }

    protected function _getPhotoStatistic(
        array $filesItems,
        string $photoDate = null,
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

            if ($photoDate && strtotime($file->date_obs . ' +5 hours') > strtotime($photoDate . ' 23:59:59'))
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