<?php

namespace App\Libraries;

use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

class RelayLibrary {

    protected array $relayListRU = [
        'Блок питания 12В'      => 6,
        'LED Flat панель'       => 7,
        'Монтировка (EQ6 Pro)'  => 0,
        'Камера (ZWO ASI 6200)' => 1,
        'Фокусер ZWO EAF'       => 2,
        'Контроллер грелок'     => 3,
    ];

    protected array $relayListEN = [
        'Power Supply 12V'      => 6,
        'LED Flat Panel'        => 7,
        'Mount (EQ6 Pro)'       => 0,
        'Camera (ZWO ASI 6200)' => 1,
        'Focuser ZWO EAF'       => 2,
        'Heater Controller'     => 3,
    ];

    /**
     * Returns a list of relays with their states.
     *
     * @param string $locale The locale to use for relay names ('ru' or 'en'). Default is 'ru'.
     * @return array An array of relays with their IDs, names, and states.
     */
    public function getList(string $locale = 'ru'): array {
        $client   = Services::curlrequest();
        $response = $client->get(getenv('app.observatory.controller') . 'pstat.xml');

        $xmlDocument = simplexml_load_string($response->getBody(), "SimpleXMLElement", LIBXML_NOCDATA);
        $jsonObject  = json_encode($xmlDocument);
        $arrayStates = json_decode($jsonObject,TRUE);
        $arrayKeys   = array_keys($arrayStates);
        $relayList   = $locale === 'ru' ? $this->relayListRU : $this->relayListEN;

        $result = [];

        foreach ($relayList as $key => $item) {
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
     * @param string $locale The locale to use for relay names ('ru' or 'en')
     * @param string $relayName The name of the relay
     * @return int The index of the relay
     */
    public function getIndexByName(
        string $locale = 'ru',
        string $relayName
    ): int {
        $relayList = $locale === 'ru' ? $this->relayListRU : $this->relayListEN;

        return $this->relayList[$relayName];
    }
}
