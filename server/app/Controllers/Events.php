<?php namespace App\Controllers;

use App\Entities\EventPhoto;
use App\Libraries\SessionLibrary;
use App\Models\EventPhotosModel;
use App\Models\EventUsersModel;
use App\Models\UsersModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\I18n\Time;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\Files\File;
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
            return $this->respond();
        }

        $eventUsersModel = new EventUsersModel();
        $bookedEvents    = $this->session->isAuth && $this->session->user->id
            ? $eventUsersModel->where(['event_id' => $eventData->id, 'user_id' => $this->session->user->id])->withDeleted()->first()
            : false;

        $currentTickets = $eventUsersModel
            ->selectSum('adults')
            // ->selectSum('children')
            ->where('event_id', $eventData->id)
            ->first();

        // $currentTickets = $currentTickets->adults + $currentTickets->children;
        $currentTickets = (int) $currentTickets->adults;

        if ($bookedEvents) {
            $eventData->registered = true;
            $eventData->canceled   = !empty($bookedEvents->deleted_at);
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

    public function show($id = null): ResponseInterface {
        $eventData = $this->model->select('title, content, cover, date')->find($id);
        $eventData->cover = '/stargazing/' . $eventData->cover;

        if (empty($eventData)) {
            return $this->failNotFound();
        }

        $eventPhotosModel = new EventPhotosModel();
        $eventPhotosData  = $eventPhotosModel->where(['event_id' => $id])->findAll();

        if (!empty($eventPhotosData)) {
            foreach ($eventPhotosData as $photo) {
                $photo->title = $eventData->title;
                $photo->full = 'stargazing/' . $id . '/' . $photo->filename . '.' . $photo->extension;
                $photo->preview = 'stargazing/' . $id . '/' . $photo->filename . '_preview.' . $photo->extension;

                unset(
                    $photo->user_id, $photo->extension, $photo->filesize,
                    $photo->filename, $photo->id, $photo->event_id,
                    $photo->created_at, $photo->updated_at, $photo->deleted_at);
            }

            $eventData->photos = $eventPhotosData;
        }

        return $this->respond($eventData);
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
        if ($eventUsersModel->where(['event_id' => $input['eventId'], 'user_id' => $this->session->user->id])->withDeleted()->first()) {
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
                "🔹Осталось слотов: <b>" . ($event->max_tickets - ($currentTickets + (int) $input['adults'])) . "</b>\n" .
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

    /**
     * @throws ReflectionException
     * @throws TelegramException
     * @throws Exception
     */
    public function cancel(): ResponseInterface {
        // Check that user is auth
        if (!$this->session->isAuth) {
            return $this->failUnauthorized();
        }

        $input = $this->request->getJSON(true);
        $rules = ['eventId' => 'required|string|max_length[13]'];

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

        $eventUsersModel  = new EventUsersModel();
        $userRegistration = $eventUsersModel->where(['event_id' => $input['eventId'], 'user_id' => $this->session->user->id])->first();

        // Check that user not already registered at this event
        if (empty($userRegistration)) {
            return $this->failValidationErrors(['error' => 'Вы еще не регистрировались на это мероприятие']);
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
            ->where('event_id', $input['eventId'])
            ->first();

        $eventUsersModel->delete($userRegistration->id);

        new Telegram(getenv('app.telegramBotKey'), '');

        Request::sendMessage([
            'chat_id'    => getenv('app.telegramChatID'),
            'parse_mode' => 'HTML',
            'text'       => "<b>Astro:</b> ❌ Отмена бронирования\n" .
                "<b>{$event->title}</b>\n" .
                "🔹Имя: <i>{$this->session->user->name}</i>\n" .
                "🔹Взрослых: <b>{$userRegistration->adults}</b>, детей: {$userRegistration->children}\n" .
                "🔹Осталось слотов: <b>" . ($event->max_tickets - (abs($currentTickets->adults - (int) $userRegistration->adults))) . "</b>\n"
        ]);

        return $this->respond(['message' => 'Вы отменили бронирование на это мероприятие']);
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

    /**
     * Uploading a photo by place ID
     * @param null $id
     * @return ResponseInterface
     * @throws ReflectionException
     */
    public function upload($id = null): ResponseInterface {
        if (!$this->session->isAuth || $this->session->user->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        if (!$photo = $this->request->getFile('photo')) {
            return $this->failValidationErrors('No photo for upload');
        }

        $eventData = $this->model->find($id);

        if (!$eventData || !$eventData->id) {
            return $this->failValidationErrors('There is no event with this ID');
        }

        if ($photo->hasMoved()) {
            return $this->failValidationErrors($photo->getErrorString());
        }

        $eventDir = UPLOAD_EVENTS . $eventData->id . '/';
        $newName  = $photo->getRandomName();
        $photo->move($eventDir, $newName, true);

        $file = new File($eventDir . $newName);
        $name = pathinfo($file, PATHINFO_FILENAME);
        $ext  = $file->getExtension();

        list($width, $height) = getimagesize($file->getRealPath());

        // Calculating Aspect Ratio
        $orientation = $width > $height ? 'h' : 'v';
        $width       = $orientation === 'h' ? $width : $height;
        $height      = $orientation === 'h' ? $height : $width;

        // If the uploaded image dimensions exceed the maximum
        if ($width > PHOTO_MAX_WIDTH || $height > PHOTO_MAX_HEIGHT) {
            $image = Services::image('gd');
            $image->withFile($file->getRealPath())
                ->fit(PHOTO_MAX_WIDTH, PHOTO_MAX_HEIGHT)
                ->reorient(true)
                ->save($eventDir . $name . '.' . $ext);

            list($width, $height) = getimagesize($file->getRealPath());
        }

        $image = Services::image('gd'); // imagick
        $image->withFile($file->getRealPath())
            ->fit(PHOTO_PREVIEW_WIDTH, PHOTO_PREVIEW_HEIGHT)
            ->save($eventDir . $name . '_preview.' . $ext);

        $eventPhotosModel = new EventPhotosModel();

        $photo = new EventPhoto();
        $photo->event_id  = $eventData->id;
        $photo->user_id   = $this->session->user?->id;
        $photo->title     = $eventData->title;
        $photo->filename  = $name;
        $photo->extension = $ext;
        $photo->filesize  = $file->getSize();
        $photo->width     = $width;
        $photo->height    = $height;

        $eventPhotosModel->insert($photo);
        return $this->respondCreated((object) [
            'full'    => 'stargazing/' . $id . '/' . $name . '.' . $ext,
            'preview' => 'stargazing/' . $id . '/' . $name . '_preview.' . $ext,
            'width'   => $photo->width,
            'height'  => $photo->height,
            'title'   => $photo->title,
            'eventId' => $photo->event_id
        ]);
    }

    public function delete($id = null): ResponseInterface {
        if ($this->session->user->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        return $this->respond();
    }
}
