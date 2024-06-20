<?php namespace App\Controllers;

use App\Libraries\SessionLibrary;
use App\Models\EventUsers;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\I18n\Time;
use CodeIgniter\RESTful\ResourceController;
use Config\Services;

class Events extends ResourceController {
    private SessionLibrary $session;

    protected $model;

    public function __construct() {
        $this->session = new SessionLibrary();
        $this->model   = new \App\Models\Events();
    }

    public function list(): ResponseInterface {
        $eventsData = $this->model->findAll();

        if (!$this->session->isAuth || !$this->session->user->id) {
            return $this->respond(['items' => $eventsData]);
        }

        $eventUsersModel = new EventUsers();
        $bookedEvents    = $eventUsersModel->where(['user_id' => $this->session->user->id])->findAll();

        foreach ($eventsData as $event) {
            $searchIndex = in_array($event->id, array_column($bookedEvents, 'event_id'));
            $event->registered = $searchIndex !== false;
        }

        return $this->respond(['items' => $eventsData]);
    }

    public function booking(): ResponseInterface {
        // Check that user is auth
        if (!$this->session->isAuth) {
            return $this->failUnauthorized();
        }

        $input = $this->request->getJSON(true);
        $rules = [
            'eventId'  => 'required|string|max_length[13]',
            'name'     => 'required|string|min_length[3]|max_length[40]',
            'phone'    => 'if_exist|min_length[6]|max_length[13]',
            'adults'   => 'required|integer|greater_than[0]|less_than[5]',
            'children' => 'integer|greater_than[-1]|less_than[5]',
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

        $eventUsersModel = new EventUsers();

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

        $eventUsersModel->insert([
            'event_id' => $input['eventId'],
            'user_id'  => $this->session->user->id,
            'adults'   => $input['adults'],
            'children' => $input['children'],
        ]);

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
