<?php namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization');

if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
    die();
}

class Weather extends ResourceController {
    use ResponseTrait;

    /**
     * @return ResponseInterface
     */
    public function current(): ResponseInterface {
        $client = \Config\Services::curlrequest();

        try {
            $response = $client->request('GET', 'https://meteo.miksoft.pro/api/get/current');
            $weather  = json_decode($response->getBody());

            return $this->respond([
                'timestamp' => $weather->timestamp,
                'conditions' => $weather->payload
            ]);
        } catch (\Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->fail('Weather error');
        }
    }

    /**
     * @return ResponseInterface
     */
    public function statistic(): ResponseInterface {
        $period = $this->request->getGet('period', FILTER_SANITIZE_SPECIAL_CHARS) ?? date('m-Y');
        $client = \Config\Services::curlrequest();

        $weatherStart = date('Y-m-d', strtotime("01-{$period}"));
        $weatherStop  = date('Y-m-t', strtotime("01-{$period}"));

        $response = $client->request('GET', "https://meteo.miksoft.pro/api/get/sensors_period?date_start={$weatherStart}&date_end={$weatherStop}&sensors=clouds,temperature,wind_speed");
        $weather  = json_decode($response->getBody());

        $days = [];

        foreach ($weather->payload as $item) {
            $sunData = date_sun_info($item->date, getenv('app.latitude'), getenv('app.longitude'));

            $sunrise = $sunData['astronomical_twilight_end'];
            $sunset  = $sunData['astronomical_twilight_begin'];

            if ($item->date > $sunset && $item->date < $sunrise) { continue; }

            $day = date('Y-m-d', $item->date);

            if (!isset($days[$day])) {
                $days[$day] = (object) ['count' => 0];
            }

            foreach ($item as $var => $val) {
                if ($var === 'date') {
                    continue;
                }

                if ($val === null) {
                    $days[$day]->$var = null;
                } else {
                    if (!isset($days[$day]->$var)) {
                        $days[$day]->$var = (float) $val;
                    } else {
                        $days[$day]->$var += (float) $val;
                    }
                }
            }

            $days[$day]->count++;
        }

        $result = [];

        foreach ($days as $date => $item) {

            foreach ($item as $var => $value) {
                if ($var === 'count') {
                    continue;
                }

                if ($value !== null) {
                    $item->$var = round($value / $item->count, 1);
                }
            }

            unset($item->count);

            $result[] = array_merge(['date' => $date], (array) $item);
        }

        return $this->respond([
            'date'    => $period,
            'weather' => $result
        ]);
    }
}