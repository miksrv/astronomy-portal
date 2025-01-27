<?php

namespace App\Controllers;

use App\Models\CatalogModel;
use App\Models\ObjectFitsFilesModel;
use App\Models\PhotoModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class Statistic extends ResourceController
{
    use ResponseTrait;

    /**
     * List of statistic summary data
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        $catalogModel = new CatalogModel();
        $photoModel   = new PhotoModel();
        $filesModel   = new ObjectFitsFilesModel();

        $framesCount = $filesModel->select('id')->countAllResults();
        $exposureSum = $filesModel->selectSum('exptime')->first();

        return $this->respond([
            'photos'   => $photoModel->select('id')->countAllResults() ?? 0,
            'objects'  => $catalogModel->select('name')->countAllResults() ?? 0,
            'frames'   => $framesCount ?? 0,
            'exposure' => $exposureSum->exptime ?? 0,
            'filesize' => round($framesCount * FITS_FILE_SIZE) ?? 0
        ]);
    }

    /**
     * @return ResponseInterface
     */
    public function catalog(): ResponseInterface
    {
        $catalogModel  = new CatalogModel();
        $catalogData   = $catalogModel->select('name')->findAll();
        $catalogResult = [];

        foreach ($catalogData as $item) {
            $catalogResult[] = $item->name;
        }

        return $this->respond([
            'items' => $catalogResult
        ]);
    }

    /**
     * @return ResponseInterface
     */
    public function photos(): ResponseInterface
    {
        $photoModel  = new PhotoModel();
        $photoData   = $photoModel->select('object')->findAll();
        $photoResult = [];

        foreach ($photoData as $item) {
            if (in_array($item->object, $photoResult)) {
                continue;
            }

            $photoResult[] = $item->object;
        }

        return $this->respond([
            'items' => $photoResult
        ]);
    }

    /**
     * @return ResponseInterface
     */
    public function telescope(): ResponseInterface
    {
        $period = $this->request->getGet('period', FILTER_SANITIZE_SPECIAL_CHARS);
        $date   = strtotime("01-{$period}");
        $where  = [];

        if ($period && checkdate(date('m', $date), 1, date('Y', $date))) {
            $month = date('m', $date);
            $year  = date('Y', $date);
            $where = ['MONTH(date_obs)' => $month, 'YEAR(date_obs)' => $year];
        }

        $filesModel = new ObjectFitsFilesModel();
        $filesData  = $filesModel
            ->select('date_obs, exptime, object')
            ->where($where)
            ->findAll();

        $daysStatistic = [];

        foreach ($filesData as $file) {
            $currentDay = date('Y-m-d', strtotime($file->date_obs . ' +5 hours'));

            if (!isset($daysStatistic[$currentDay])) {
                $daysStatistic[$currentDay] = (object) [
                    'telescope_date' => $currentDay,
                    'total_exposure' => 0,
                    'frames_count'   => 0,
                    'catalog_items'  => []
                ];
            }

            $daysStatistic[$currentDay]->total_exposure += $file->exptime;
            $daysStatistic[$currentDay]->frames_count   += 1;

            if (!in_array($file->object, $daysStatistic[$currentDay]->catalog_items)) {
                $daysStatistic[$currentDay]->catalog_items[] = $file->object;
            }
        }

        $result = [];

        foreach ($daysStatistic as $day) {
            $result[] = $day;
        }

        unset($daysStatistic);

        usort($result, fn($a, $b) => $b->telescope_date <=> $a->telescope_date);

        return $this->respond([
            'count' => count($result),
            'items' => $result
        ]);
    }
}
