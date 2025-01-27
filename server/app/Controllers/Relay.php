<?php

namespace App\Controllers;

use App\Libraries\RelayLibrary;
use App\Libraries\SessionLibrary;
use App\Models\ObservatorySettingsModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\I18n\Time;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Exception;

// The time during which the user cannot turn on the light from the moment it was last turned on
define('LIGHT_SWITCH_COOLDOWN', 60 * 5);
define('LIGHT_SWITCH_OFF_INTERVAL', 60);
define('LIGHT_SWITCH_NAME', 'LED Flat панель');

class Relay extends ResourceController
{
    use ResponseTrait;

    private ObservatorySettingsModel $settingsModel;

    private RelayLibrary $relayLibrary;

    private SessionLibrary $session;

    public function __construct()
    {
        $this->settingsModel = new ObservatorySettingsModel();
        $this->relayLibrary  = new RelayLibrary();
        $this->session       = new SessionLibrary();
    }

    /**
     * Returns a list of relays with their states, tells whether the user can turn on the light relay
     * @api GET /relay/list
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        try {
            $relayStatuses = $this->relayLibrary->getList();
            $turnedCounter = (int) $this->settingsModel->find('light_turned_counter')->value;

            $this->_checkUserLightAndTurn($relayStatuses);

            return $this->respond([
                'items' => $relayStatuses,
                'light' => (object) [
                    'enable'   => $this->_userCanTurnLight($relayStatuses),
                    'cooldown' => $this->_userTurnLightCooldown(),
                    'counter'  => $turnedCounter,
                ]
            ]);

        } catch (Exception $e) {
            log_message('error', $e);

            return $this->fail('Relay state errors');
        }
    }

    /**
     * Set relay state by ID
     * @return ResponseInterface
     * @api PUT /relay/set
     * @param {id: int, state: int}
     */
    public function set(): ResponseInterface
    {
        $inputJSON = $this->request->getJSON();

        if (empty($inputJSON)) {
            $this->failValidationErrors('Invalid request format');
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        $index = $inputJSON->id ?? null;
        $state = $inputJSON->state ?? null;

        if (is_null($index) || is_null($state)) {
            log_message('error', '[' .  __METHOD__ . '] Empty device (' . $index . ') or status (' . $state . ')');
            $this->fail('Relay set status errors');
        }

        log_message('info', '[' .  __METHOD__ . '] Set device (' . $index . ') status (' . $state . ')');

        try {
            $response = $this->relayLibrary->setState($index, $state);

            return $this->respond([
                'id'     => $index,
                'state'  => $response->getStatusCode() === 200 ? $state : !$state,
                'result' => $response->getStatusCode() === 200
            ]);
        } catch (Exception $e) {
            return $this->fail('Relay set status errors');
        }
    }

    /**
     * The command allows you to turn on the relay to which the lighting lamp inside the observatory is connected.
     * Before executing the command, we will query the status of all relays to check if the user can turn on the light.
     * @return ResponseInterface
     * @api GET /relay/light
     * @throws Exception
     */
    public function light(): ResponseInterface
    {
        // For reliability, to know exactly the ID of the relay that turns on the light
        $lightRelayIndex  = $this->relayLibrary->getIndexByName(LIGHT_SWITCH_NAME);
        $userCanTurnLight = $this->_userCanTurnLight($this->relayLibrary->getList());

        if (!$lightRelayIndex || !$userCanTurnLight) {
            return $this->fail('Relay set status errors');
        }

        try {
            $turnedCounter = (int) $this->settingsModel->find('light_turned_counter')->value;
            $response = $this->relayLibrary->setState($lightRelayIndex, 1);

            // Сохраняем текущие значения в таблице с настройками:
            $this->settingsModel->update('light_turned_counter', ['value' => $turnedCounter + 1]);
            $this->settingsModel->update('light_turned_by_user', ['value' => 1]);
            $this->settingsModel->update('last_time_light_turned_user', ['value' => time()]);

            return $this->respond([
                'result' => $response->getStatusCode() === 200
            ]);
        } catch (Exception $e) {
            return $this->fail('Relay set status errors');
        }
    }

    /**
     * A method based on a list of relays and their states checks whether the user can turn on the light.
     *  The user cannot turn on the light relay if:
     *   1. The relay list is empty or there was an error connecting to the remote relay block
     *   2. If any relay in the observatory is currently turned on
     *   3. If the time between the last time the relay was turned on by the user was less than LIGHT_SWITCH_COOLDOWN (5 minutes)
     * @param array $relayStates
     * @return bool
     * @throws Exception
     */
    protected function _userCanTurnLight(array $relayStates): bool
    {
        if (empty($relayStates)) {
            return false;
        }

        // If we have any equipment running, the user cannot turn on the light in the observatory
        if (in_array(1, array_column($relayStates, 'state')) !== false) {
            return false;
        }

        // We check when someone last turned on the light.
        // If the cooling time has not yet expired, the light cannot be turned on.
        if ($this->_userTurnLightCooldown() > 0) {
            return false;
        }

        return true;
    }

    /**
     * Returns the time the users last turned on the lights in the observatory
     * @return int|null
     * @throws Exception
     */
    protected function _userTurnLightCooldown(): int
    {
        $lastTimeLight = $this->settingsModel->find('last_time_light_turned_user')->value;

        if ($lastTimeLight === null) {
            return 0;
        }

        $timeNow  = Time::now();
        $timeDiff = $timeNow->difference(Time::createFromTimestamp($lastTimeLight))->getSeconds();
        $cooldown = abs($timeDiff);

        return LIGHT_SWITCH_COOLDOWN >= $cooldown
            ? LIGHT_SWITCH_COOLDOWN - $cooldown
            : 0;
    }

    /**
     * We check to see if our lights are on more than they should be.
     * If yes, turn off the light behind the user
     * @param array $relayStates
     * @return void
     * @throws Exception
     */
    protected function _checkUserLightAndTurn(array $relayStates): void
    {
        $searchIndex = array_search(LIGHT_SWITCH_NAME, array_column($relayStates, 'name'));
        $turnedUser  = (bool) $this->settingsModel->find('light_turned_by_user')->value;

        // If we received the value that the relay was turned on by the user, but the relay is now turned on,
        // we change the value in the database
        if ($turnedUser && $relayStates[$searchIndex]['state'] === 0) {
            $this->settingsModel->update('light_turned_by_user', ['value' => 0]);
            return ;
        }

        // If the relay is not in the list or is turned off, skip it
        if (!isset($relayStates[$searchIndex]) || $relayStates[$searchIndex]['state'] === 0) {
            return ;
        }

        // We turn off the relay automatically when the timer reaches the maximum operation of the light bulb
        if ($relayStates[$searchIndex]['state'] === 1 && $turnedUser && ($this->_userTurnLightCooldown() + LIGHT_SWITCH_OFF_INTERVAL) < LIGHT_SWITCH_COOLDOWN) {
            $this->relayLibrary->setState($relayStates[$searchIndex]['id'], 0);
            $this->settingsModel->update('light_turned_by_user', ['value' => 0]);
            return ;
        }

        // If the relay is turned on, the countdown counter has already reached 0 and the light was turned on by the user,
        // then turn it off
        if ($relayStates[$searchIndex]['state'] === 1 && $turnedUser && $this->_userTurnLightCooldown() === 0) {
            $this->relayLibrary->setState($relayStates[$searchIndex]['id'], 0);
            $this->settingsModel->update('light_turned_by_user', ['value' => 0]);
            log_message('info', 'The light relay was turned off automatically after the last time it was turned on by the user');
        }
    }
}
