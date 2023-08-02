<?php namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use function Amp\delay;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, PATCH, PUT');
header('Access-Control-Allow-Headers: X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization');

if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
    die();
}

class Relay extends ResourceController
{
    use ResponseTrait;

    protected array $relayList = [
        'Блок питания 12В'      => 6,
        'LED Flat панель'       => 7,
        'Монтировка (EQ6 Pro)'  => 0,
        'Камера (ZWO ASI 6200)' => 1,
        'Фокусер ZWO EAF'       => 2,
        'Контроллер грелок'     => 3,
    ];

    public function list(): ResponseInterface
    {
        try {
            $client   = \Config\Services::curlrequest();
            $response = $client->get(getenv('app.observatory.controller') . 'pstat.xml');

            $xmlDocument = simplexml_load_string($response->getBody(), "SimpleXMLElement", LIBXML_NOCDATA);
            $jsonObject  = json_encode($xmlDocument);
            $arrayStates = json_decode($jsonObject,TRUE);
            $arrayKeys   = array_keys($arrayStates);

            $result = [];

            foreach ($this->relayList as $key => $item)
            {
                $result[] = [
                    'id'    => $item,
                    'name'  => $key,
                    'state' => (integer) $arrayStates[$arrayKeys[$item]],
                ];
            }

            return $this->respond(['items' => $result]);
        } catch (\Exception $e) {
            return $this->fail('Relay state errors');
        }
    }

    /**
     * Set relay state by ID
     * @return ResponseInterface
     */
    public function set(): ResponseInterface
    {
        $inputJSON = $this->request->getJSON();

        if (empty($inputJSON))
        {
            exit();
        }

        $index = $inputJSON->id ?? null;
        $state = $inputJSON->state ?? null;

        if (is_null($index) || is_null($state) || !array_search($index, $this->relayList))
        {
            log_message('error', '[' .  __METHOD__ . '] Empty device (' . $index . ') or status (' . $state . ')');
            $this->fail('Relay set status errors');
        }

        log_message('info', '[' .  __METHOD__ . '] Set device (' . $index . ') status (' . $state . ')');

        try {
            $client = \Config\Services::curlrequest();

            // https://silines.ru/documentation/RODOS/RODOS-EthernetRelay.pdf
            $action   = $state === 0 ? 'f' : 'n';
            $format   = "rb{$index}{$action}.cgi";
            $response = $client->get(getenv('app.observatory.controller') . $format);

            return $this->respond([
                'id'     => $index,
                'state'  => $response->getStatusCode() === 200 ? $state : !$state,
                'result' => $response->getStatusCode() === 200
            ]);
        } catch (\Exception $e) {
            return $this->fail('Relay set status errors');
        }
    }
}