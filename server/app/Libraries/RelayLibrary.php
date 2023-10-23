<?php namespace App\Libraries;

use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

class RelayLibrary {

    protected array $relayList = [
        'Блок питания 12В'      => 6,
        'LED Flat панель'       => 7,
        'Монтировка (EQ6 Pro)'  => 0,
        'Камера (ZWO ASI 6200)' => 1,
        'Фокусер ZWO EAF'       => 2,
        'Контроллер грелок'     => 3,
    ];

    /**
     * Returns a list of relays with their states
     * @return array
     */
    public function getList(): array {
        $client   = Services::curlrequest();
        $response = $client->get(getenv('app.observatory.controller') . 'pstat.xml');

        $xmlDocument = simplexml_load_string($response->getBody(), "SimpleXMLElement", LIBXML_NOCDATA);
        $jsonObject  = json_encode($xmlDocument);
        $arrayStates = json_decode($jsonObject,TRUE);
        $arrayKeys   = array_keys($arrayStates);

        $result = [];

        foreach ($this->relayList as $key => $item) {
            $result[] = [
                'id'    => $item,
                'name'  => $key,
                'state' => (integer) $arrayStates[$arrayKeys[$item]],
            ];
        }

        return $result;
    }

    /**
     * Set relay state by ID
     * @param int $relayId
     * @param int $state
     * @extends https://silines.ru/documentation/RODOS/RODOS-EthernetRelay.pdf
     * @return ResponseInterface
     */
    public function setState(int $relayId, int $state): ResponseInterface {
        $client = Services::curlrequest();
        $action = $state === 0 ? 'f' : 'n'; // f - 'off', n - 'on'
        $format = "rb{$relayId}{$action}.cgi";

        return $client->get(getenv('app.observatory.controller') . $format);
    }

    /**
     * Find and return relay index by name
     * @param string $relayName
     * @return int
     */
    public function getIndexByName(string $relayName): int {
        return $this->relayList[$relayName];
    }
}