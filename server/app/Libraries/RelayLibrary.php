<?php

namespace App\Libraries;

use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

const RELAY_POWER_SUPPLY_12V     = 6;
const RELAY_LED_FLAT_PANEL       = 7;
const RELAY_MOUNT_EQ6_PRO        = 0;
const RELAY_CAMERA_ZWO_ASI_6200  = 1;
const RELAY_FOCUSER_ZWO_EAF      = 2;
const RELAY_HEATER_CONTROLLER    = 3;

class RelayLibrary {
    protected array $relayListRU = [
        'Блок питания 12В'      => RELAY_POWER_SUPPLY_12V,
        'LED Flat панель'       => RELAY_LED_FLAT_PANEL,
        'Монтировка (EQ6 Pro)'  => RELAY_MOUNT_EQ6_PRO,
        'Камера (ZWO ASI 6200)' => RELAY_CAMERA_ZWO_ASI_6200,
        'Фокусер ZWO EAF'       => RELAY_FOCUSER_ZWO_EAF,
        'Контроллер грелок'     => RELAY_HEATER_CONTROLLER,
    ];

    protected array $relayListEN = [
        'Power Supply 12V'      => RELAY_POWER_SUPPLY_12V,
        'LED Flat Panel'        => RELAY_LED_FLAT_PANEL,
        'Mount (EQ6 Pro)'       => RELAY_MOUNT_EQ6_PRO,
        'Camera (ZWO ASI 6200)' => RELAY_CAMERA_ZWO_ASI_6200,
        'Focuser ZWO EAF'       => RELAY_FOCUSER_ZWO_EAF,
        'Heater Controller'     => RELAY_HEATER_CONTROLLER,
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
     * Find and return relay index
     * @return int The index of the relay
     */
    public function getLightRelayIndex(): int {
        return RELAY_LED_FLAT_PANEL;
    }
}
