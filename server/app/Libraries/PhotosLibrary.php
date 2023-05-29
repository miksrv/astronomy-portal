<?php namespace App\Libraries;

use App\Models\FilesModel;
use App\Models\PhotoModel;

class PhotosLibrary
{
    /**
     * @param string $objectName
     * @param string|null $date
     * @return array|object|null
     */
    public function getPhotoByObject(string $objectName, string $date = null)
    {
        $where = ['object' => $objectName];

        if ($date) {
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

        return $this->addPhotoStatistic($filesItem, $photoItem);
    }

    /**
     * @param string|null $filterObject
     * @param int $filterLimit
     * @param string $order
     * @return array|null
     */
    public function getPhotoList(string $filterObject = null, int $filterLimit = 0, string $order = 'date'): ?array
    {
        $photoModel = new PhotoModel();
        $modelFiles = new FilesModel();
        $modelFiles->select(['object', 'filter', 'date_obs', 'exptime']);
        $photoModel
            ->select('photos.*, authors.id as author_id, authors.name as author_name, authors.link as author_link')
            ->join('authors', 'authors.id = photos.author_id', 'left')
            ->orderBy($order === 'random' ? 'RAND()' : $order, 'DESC');

        if ($filterObject) {
            $photoModel->where(['object' => $filterObject]);
            $modelFiles->where(['object' => $filterObject]);
        }

        $photoList = $photoModel->findAll($filterLimit);
        $filesList = $modelFiles->findAll();

        if (!$photoList) {
            return null;
        }

        foreach ($photoList as $photo) {
            $this->addPhotoStatistic($filesList, $photo, $photo->object);
        }

        return $photoList;
    }

    /**
     * @param $filters
     * @return object|null
     */
    protected function calculateObjectStatistic($filters): ?object
    {
        if (empty($filters)) {
            return null;
        }

        $objectStatistic = (object) [
            'frames'   => 0,
            'exposure' => 0
        ];

        foreach ($filters as $filter) {
            $objectStatistic->frames   += $filter->frames ?? 0;
            $objectStatistic->exposure += $filter->exposure ?? 0;
        }

        return $objectStatistic;
    }

    /**
     * @param array $filesList
     * @param $photo
     * @param string|null $object
     * @return object
     */
    protected function addPhotoStatistic(array $filesList, $photo, string $object = null): object
    {
        $libraryStatistic = new StatisticLibrary();

        $objectStatistic = $libraryStatistic->getObjectStatistic($filesList, $object, $photo->date);
        $objectCalculate = $this->calculateObjectStatistic($photo->filters);

        $photo->custom    = !empty($photo->filters);
        $photo->statistic = $objectCalculate ?? $objectStatistic->objectStatistic ?? null;
        $photo->filters   = $photo->filters ?? $objectStatistic->filterStatistic ?? null;
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

        return $photo;
    }
}
