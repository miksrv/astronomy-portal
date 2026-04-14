<?php

namespace App\Controllers;

use App\Models\ObjectFitsFilesModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class Statistic extends ResourceController
{
    use ResponseTrait;

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
            ->select("DATE(DATE_ADD(date_obs, INTERVAL 5 HOUR)) as obs_date, object, SUM(exptime) as total_exptime, COUNT(*) as frames_count")
            ->where($where)
            ->groupBy('DATE(DATE_ADD(date_obs, INTERVAL 5 HOUR)), object')
            ->findAll();

        $daysStatistic = [];

        foreach ($filesData as $file) {
            $currentDay = $file->obs_date;

            if (!isset($daysStatistic[$currentDay])) {
                $daysStatistic[$currentDay] = (object) [
                    'telescope_date' => $currentDay,
                    'total_exposure' => 0,
                    'frames_count'   => 0,
                    'catalog_items'  => []
                ];
            }

            $daysStatistic[$currentDay]->total_exposure += (float) $file->total_exptime;
            $daysStatistic[$currentDay]->frames_count   += (int) $file->frames_count;

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
