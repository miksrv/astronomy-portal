<?php namespace App\Controllers;

use App\Libraries\SessionLibrary;
use App\Models\EventUsersModel;
use App\Models\UsersModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\I18n\Time;
use CodeIgniter\RESTful\ResourceController;
use Config\Services;
use Exception;
use Longman\TelegramBot\Exception\TelegramException;
use Longman\TelegramBot\Request;
use Longman\TelegramBot\Telegram;
use ReflectionException;

class Events extends ResourceController {
    private SessionLibrary $session;

    protected $model;

    public function __construct() {
        $this->session = new SessionLibrary();
        $this->model   = new \App\Models\EventsModel();
    }

    public function upcoming(): ResponseInterface {
        $eventData = $this->model
            ->where('date >=', new Time('now'))
            ->orderBy('date', 'DESC')
            ->first();

        if (empty($eventData)) {
            return $this->failResourceGone('No data');
        }

        $eventUsersModel = new EventUsersModel();
        $bookedEvents    = $this->session->isAuth && $this->session->user->id
            ? $eventUsersModel->where(['user_id' => $this->session->user->id])->findAll()
            : false;

        $currentTickets = $eventUsersModel
            ->selectSum('adults')
            // ->selectSum('children')
            ->where('event_id', $eventData->id)
            ->first();

        // $currentTickets = $currentTickets->adults + $currentTickets->children;
        $currentTickets = (int) $currentTickets->adults;

        if ($bookedEvents) {
            $searchIndex = in_array($eventData->id, array_column($bookedEvents, 'event_id'));
            $eventData->registered  = $searchIndex !== false;
        }

        $eventData->max_tickets = $eventData->max_tickets - $currentTickets;

        if ($eventData->max_tickets < 0) {
            $eventData->max_tickets = 0;
        }

        if ($eventData->cover) {
            $eventData->cover = '/stargazing/' . $eventData->cover;
        }

        if (!$eventData->registered) {
            unset($eventData->yandexMap, $eventData->googleMap);
        }

        unset($eventData->created_at, $eventData->updated_at, $eventData->deleted_at);

        return $this->respond($eventData);
    }

    public function list(): ResponseInterface {
        $eventsData = $this->model
            ->select('id, title, date, cover')
            ->where('date >', new Time('now'))
            ->orderBy('date', 'DESC')
            ->findAll();

        if (empty($eventsData)) {
            return $this->respond(['items' => []]);
        }

        foreach ($eventsData as $event) {
            if ($event->cover) {
                $event->cover = '/stargazing/' . $event->cover;
            }

            unset($event->registrationStart, $event->registrationEnd, $event->availableTickets, $event->yandexMap, $event->googleMap);
        }

        return $this->respond(['items' => $eventsData]);
    }

    /**
     * @throws ReflectionException
     * @throws TelegramException
     * @throws Exception
     */
    public function booking(): ResponseInterface {
        // Check that user is auth
        if (!$this->session->isAuth) {
            return $this->failUnauthorized();
        }

        $input = $this->request->getJSON(true);
        $rules = [
            'eventId'  => 'required|string|max_length[13]',
            'name'     => 'required|string|min_length[3]|max_length[40]',
            'phone'    => 'if_exist|min_length[6]|max_length[40]',
            'adults'   => 'required|integer|greater_than[0]|less_than[6]',
            'children' => 'integer|greater_than[-1]|less_than[6]'
        ];

        $this->validator = Services::Validation()->setRules($rules);

        // Check input data validation rules
        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $event = $this->model->find($input['eventId']);
        // Check that event with ID is exists
        if (!$event) {
            $this->failValidationErrors(['error' => 'Такого мероприятия не существует']);
        }

        $eventUsersModel = new EventUsersModel();

        // Check that user not already registered at this event
        if ($eventUsersModel->where(['event_id' => $input['eventId'], 'user_id' => $this->session->user->id])->first()) {
            return $this->failValidationErrors(['error' => 'Вы уже зарегистрировались на это мероприятие']);
        }

        // Check registration start and end dates
        $currentTime   = new Time('now');
        $timeDiffStart = $currentTime->difference($event->registration_start);
        $timeDiffEnd   = $currentTime->difference($event->registration_end);

        if ($timeDiffStart->getSeconds() >= 0 || $timeDiffEnd->getSeconds() <= 0) {
            return $this->failValidationErrors(['error' => 'Регистрация на мероприятие уже знакончилась или еще не начиналась']);
        }

        // Check available tickets
        $currentTickets = $eventUsersModel
            ->selectSum('adults')
            ->selectSum('children')
            ->where('event_id', $input['eventId'])
            ->first();

        // $currentTickets = $currentTickets->adults + $currentTickets->children;
        $totalMembers   = (int) $currentTickets->adults + (int) $currentTickets->children;
        $currentTickets = (int) $currentTickets->adults;

        if ($currentTickets >= (int) $event->max_tickets) {
            return $this->failValidationErrors(['error' => 'Регистрация на мероприятие уже закончилась из-за того, что все места уже забронированы']);
        }

        $childrenAges = $input['childrenAges'] ?? [];
        $eventUsersModel->insert([
            'event_id' => $input['eventId'],
            'user_id'  => $this->session->user->id,
            'adults'   => $input['adults'],
            'children' => $input['children'],

            'children_ages' => json_encode($childrenAges),
        ]);

        new Telegram(getenv('app.telegramBotKey'), '');

        Request::sendMessage([
            'chat_id'    => getenv('app.telegramChatID'),
            'parse_mode' => 'HTML',
            'text'       => "<b>Astro:</b> 🙋Регистрация на астровыезд\n" .
                "<b>{$event->title}</b>\n" .
                "🔹Имя: <i>{$input['name']}</i>\n" .
                "🔹Взрослых: <b>{$input['adults']}</b>, детей: {$input['children']}\n" .
                "🔹Осталось мест: <b>" . ($event->max_tickets - ($currentTickets + (int) $input['adults'])) . "</b>\n" .
                (count($childrenAges) > 0 ? "🔹Возраст детей: <b>" . implode(', ', $childrenAges) . "</b>\n" : "") .
                "🔹Зарегистрировано: <b>" . ($totalMembers + (int) $input['adults'] + (int) $input['children']) . "</b>"
        ]);

        $userModel  = new UsersModel();
        $updateData = [];

        if (!empty($input['name'])) {
            $updateData['name'] = $input['name'];
        }

        if (!empty($input['phone'])) {
            $updateData['phone'] = $input['phone'];
        }

        if (!empty($updateData)) {
            $userModel->update($this->session->user->id, $updateData);
        }

        return $this->respond(['message' => 'Вы успешно зарегистрировались на мероприятие']);
    }

    public function show($id = null): ResponseInterface {
        return $this->respond();
    }

    public function create(): ResponseInterface {
        if ($this->session->user->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        return $this->respond();
    }

    public function update($id = null): ResponseInterface {
        if ($this->session->user->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        return $this->respond();
    }

    public function upload($id = null): ResponseInterface {
        if ($this->session->user->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        return $this->respond();
    }

    public function delete($id = null): ResponseInterface {
        if ($this->session->user->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        return $this->respond();
    }
}
