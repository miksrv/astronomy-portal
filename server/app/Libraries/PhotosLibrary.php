<?php namespace App\Libraries;

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

        $photoModel = new PhotoModel();
        $filesModel = new FilesModel();
        $photoItem  = $photoModel
            ->select('photos.*, authors.id as author_id, authors.name as author_name, authors.link as author_link')
            ->join('authors', 'authors.id = photos.author_id', 'left')
            ->where($where)
            ->orderBy('date', 'DESC')
            ->first();

        $filesItem = $filesModel->where(['object' => $objectName])->findAll();
        $statistic = $this->_getPhotoStatistic($filesItem, $photoItem->date);

        $photoItem->statistic = $statistic->objectStatistic;
        $photoItem->filters   = $statistic->filterStatistic;
        $photoItem->author    = $photoItem->author_id
            ? [
                'id'   => $photoItem->author_id,
                'name' => $photoItem->author_name ?? '',
                'link' => $photoItem->author_link ?? '',
            ]
            : null;

        unset($photoItem->author_id, $photoItem->created_at, $photoItem->updated_at, $photoItem->deleted_at);

        return $photoItem;
    }

    /**
     * @param string|null $filterObject
     * @param int $filterLimit
     * @param string $order
     * @return array|null
     */
    function getPhotoList(string $filterObject = null, int $filterLimit = 0, string $order = 'date'): ?array
    {
        $photoModel = new PhotoModel();
        $modelFiles = new FilesModel();
        $modelFiles->select(['object', 'filter', 'date_obs', 'exptime']);
        $photoModel
            ->select('photos.*, authors.id as author_id, authors.name as author_name, authors.link as author_link')
            ->join('authors', 'authors.id = photos.author_id', 'left')
            ->orderBy($order === 'random' ? 'RAND()' : $order, 'DESC');

        if ($filterObject)
        {
            $photoModel->where(['object' => $filterObject]);
            $modelFiles->where(['object' => $filterObject]);
        }

        $photoList = $photoModel->findAll($filterLimit);
        $filesList = $modelFiles->findAll();

        if (!$photoList) return null;

        foreach ($photoList as $photo)
        {
            $objectStatistic = $this->_getPhotoStatistic($filesList, $photo->date, $photo->object);

            $photo->statistic = $objectStatistic->objectStatistic;
            $photo->filters   = $objectStatistic->filterStatistic;
            $photo->author    = $photo->author_id
                ? [
                    'id'   => $photo->author_id,
                    'name' => $photo->author_name ?? '',
                    'link' => $photo->author_link ?? '',
                  ]
                : null;

            unset(
                $photo->created_at, $photo->updated_at, $photo->deleted_at,
                $photo->author_id, $photo->author_name, $photo->author_link,
            );
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