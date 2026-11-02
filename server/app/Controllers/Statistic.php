<?php

namespace App\Controllers;

use App\Models\EventsModel;
use App\Models\EventsUsersModel;
use App\Models\ObjectFitsFilesModel;
use CodeIgniter\HTTP\ResponseInterface;

class Statistic extends BaseApiController
{
    /**
     * Returns aggregate stargazing statistics shared by the landing page and the
     * /stargazing section: the number of conducted events and the total number of
     * registered participants. The legacy-participants offset (events held before
     * the registration system existed) is added on the client.
     *
     * @return ResponseInterface
     */
    public function stargazing(): ResponseInterface
    {
        $eventsModel      = new EventsModel();
        $eventsUsersModel = new EventsUsersModel();

        return $this->respond([
            'events'  => $eventsModel->getConductedCount(),
            'members' => $eventsUsersModel->getTotalParticipants(),
        ]);
    }

    /**
     * Imaging statistics per observing night: total exposure, frame count and the objects
     * shot. A night runs from local noon to the next local noon and is named after its
     * evening (see ObjectFitsFilesModel::NIGHT_EXPRESSION), so frames taken after midnight
     * count towards the night they belong to. Optional `?period=MM-YYYY` narrows it to a month.
     *
     * @return ResponseInterface
     */
    public function telescope(): ResponseInterface
    {
        $period = $this->request->getGet('period', FILTER_SANITIZE_SPECIAL_CHARS);
        $date   = strtotime("01-{$period}");
        $night  = ObjectFitsFilesModel::NIGHT_EXPRESSION;
        $where  = [];

        if ($period && $date && checkdate(date('m', $date), 1, date('Y', $date))) {
            $where = ["MONTH({$night})" => date('m', $date), "YEAR({$night})" => date('Y', $date)];
        }

        // New frames arrive at most once per night, so a short cache spares the full-table scan
        $cache    = \Config\Services::cache();
        $cacheKey = 'statistic_telescope_' . ($where ? date('Y_m', $date) : 'all');
        $cached   = $cache->get($cacheKey);

        if ($cached !== null) {
            return $this->respond($cached);
        }

        $filesModel = new ObjectFitsFilesModel();
        $filesData  = $filesModel
            ->select("{$night} as obs_date, object, SUM(exptime) as total_exptime, COUNT(*) as frames_count", false)
            ->where('date_obs IS NOT NULL')
            ->where($where)
            // No escaping: the builder would otherwise split the expression on its own comma
            ->groupBy("{$night}, object", false)
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

        $result = array_values($daysStatistic);

        unset($daysStatistic);

        usort($result, fn($a, $b) => $b->telescope_date <=> $a->telescope_date);

        $response = [
            'count' => count($result),
            'items' => $result
        ];

        $cache->save($cacheKey, $response, 600);

        return $this->respond($response);
    }
}
