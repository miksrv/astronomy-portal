<?php namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, PATCH');
header('Access-Control-Allow-Headers: X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization');

if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
    die();
}

define('LABEL_NOT_USED', '[Не задействовано]');

class Relay extends ResourceController
{
    use ResponseTrait;

    protected int $_cmd_set = 5;
    protected int $_cmd_get = 10;

    protected array $relayList = [
        'Блок питания 12В',
        LABEL_NOT_USED,
        'Монтировка (EQ6 Pro)',
        'Контроллер грелок',
        'Фокусер ZWO EAF',
        'Камера (ZWO ASI 1600mm)',
        LABEL_NOT_USED,
        LABEL_NOT_USED,
        'LED Flat панель'
    ];

    /**
     * List of all relay states
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        return $this->respond(['items' => $this->relayList]);
    }

    public function state()
    {
        try {
            $client   = \Config\Services::curlrequest();
            $response = $client->get(getenv('app.observatory.controller') . '?command=' . $this->_cmd_get);

            $json = json_decode($response->getBody());
            $result = [];

            foreach ($json->relay as $key => $item)
            {
                foreach ($item as $state)
                {
                    $result[$key] = $state;
                }
            }

            return $this->respond($result);
        } catch (\Exception $e) {
            return $this->fail('Relay state errors');
        }
    }

    /**
     * Set relay state by ID
     * @param int|null $id
     * @return ResponseInterface
     */
    public function set(int $id = null): ResponseInterface
    {
        $inputJSON = $this->request->getJSON();

        if (empty($inputJSON))
        {
            exit();
        }

        $index = $inputJSON->index ?? null;
        $state = $inputJSON->state ?? null;

        if (is_null($index) || is_null($state))
        {
            log_message('error', '[' .  __METHOD__ . '] Empty device (' . $index . ') or status (' . $state . ')');
            $this->_response(null);
        }

        log_message('info', '[' .  __METHOD__ . '] Set device (' . $index . ') status (' . $state . ')');

        $client = \Config\Services::curlrequest();
        $response = $client->get(getenv('app.observatory.controller') . '?command=' . $this->_cmd_set . '&pin=' . $index . '&set=' . $state);

        return $this->respond($response);
    }
}