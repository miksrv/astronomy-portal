<?php

namespace App\Controllers;

use App\Entities\EventEntity;
use App\Entities\EventPhotoEntity;
use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Models\EventsPhotosModel;
use App\Models\EventsUsersModel;
use App\Models\UsersModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\I18n\Time;
use CodeIgniter\Files\File;
use Config\Services;

use Longman\TelegramBot\Exception\TelegramException;
use Longman\TelegramBot\Request;
use Longman\TelegramBot\Telegram;

use ReflectionException;
use Exception;

/**
 * Class Events
 * @package App\Controllers
 *
 * @method ResponseInterface upcoming() Retrieves the upcoming event details.
 * @method ResponseInterface list() Retrieves a list of past events with localized details.
 * @method ResponseInterface show(int|null $id) Retrieves detailed information for a specific past event by its ID with localized content.
 * @method ResponseInterface create() Creates a new event with the provided details.
 * @method ResponseInterface booking() Books a user for an event.
 * @method ResponseInterface cancel() Cancels a user's booking for an event.
 * @method ResponseInterface upload(int|null $id) Uploads a photo for a specific event by its ID.
 * @method ResponseInterface delete(int|null $id) Deletes an event by its ID.
 */
class Events extends ResourceController
{
    private SessionLibrary $session;

    protected $model;

    public function __construct()
    {
        new LocaleLibrary();

        $this->session = new SessionLibrary();
        $this->model   = new \App\Models\EventsModel();
    }

    public function upcoming(): ResponseInterface
    {
        $eventData = $this->model->getUpcomingEvent();

        if (empty($eventData)) {
            return $this->respond('');
        }

        $eventUsersModel = new EventsUsersModel();
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

        if (!$eventData->registered) {
            unset($eventData->yandexMap, $eventData->googleMap);
        }

        unset($eventData->created_at, $eventData->updated_at, $eventData->deleted_at);

        return $this->respond($eventData);
    }

    /**
     * Retrieves a list of past events with localized details and returns them in a structured response.
     *
     * This method fetches the list of past events using the specified locale, which is obtained from the
     * request object. The response includes the count of events and an array of event items.
     * If an error occurs, a server error response is returned and the exception is logged.
     *
     * @return ResponseInterface Returns a JSON response with the count and items or an error message on failure.
     */
    public function list(): ResponseInterface
    {
        $locale = $this->request->getLocale();

        try {
            // Fetch data from models
            $result = $this->model->getPastEventsList($locale);

            // Return the response with count and items
            return $this->respond([
                'count' => count($result),
                'items' => $result
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * Retrieves a list of event photos with localized details and returns them in a structured response.
     *
     * This method fetches the list of event photos using the specified locale, event, limit, and order,
     * which are obtained from the request object. The response includes the count of photos and an array of photo items.
     * If an error occurs, a server error response is returned and the exception is logged.
     *
     * @return ResponseInterface Returns a JSON response with the count and items or an error message on failure.
     */
    public function photos(): ResponseInterface
    {
        $locale = $this->request->getLocale();
        $limit  = $this->request->getGet('limit', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $order  = $this->request->getGet('order', FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);
        $event  = $this->request->getGet('eventId', FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);

        try {
            $eventPhotosModel = new EventsPhotosModel();

            // Fetch data from models
            $result = $eventPhotosModel->getPhotoList($locale, $event, $limit, $order);

            // Return the response with count and items
            return $this->respond([
                'count' => count($result),
                'items' => $result
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * Retrieves detailed information for a specific past event by its ID with localized content.
     *
     * This method fetches event details based on the provided event ID, utilizing the specified locale
     * from the request to return translated content if available. If the event is not found, a 404
     * response is returned. Additionally, any exceptions encountered are logged, and a server error
     * response is returned.
     *
     * @param int|null $id The ID of the event to retrieve. Defaults to null.
     *
     * @return ResponseInterface Returns a JSON response with the event details if found, or a 404
     * error response if the event does not exist. In case of an error, a server error message is returned.
     */
    public function show($id = null): ResponseInterface
    {
        $locale = $this->request->getLocale();

        // TODO Если событие архивное - не нужно присылать ссылку на карты, даты начала и окончания регистрации
        try {
            // Fetch data from models
            $result = $this->model->getPastEventsList($locale, $id);

            if (empty($result)) {
                return $this->failNotFound();
            }

            $eventPhotosModel = new EventsPhotosModel();
            $eventPhotosData  = $eventPhotosModel->getPhotoList($locale, $id);

            $result = $result[0];
            $result->photos = $eventPhotosData;

            return $this->respond($result);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    public function create(): ResponseInterface {
        if ($this->session->user->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        $input = $this->request->getPost();
        $file  = $this->request->getFile('upload');

        $rules = [
            'title'             => 'required|string|max_length[250]',
            'tickets'           => 'required|integer|greater_than[0]|less_than[5000]',
            'date'              => 'required|string|max_length[50]',
            'registrationStart' => 'required|string|max_length[50]',
            'registrationEnd'   => 'required|string|max_length[50]',
            'googleMap'         => 'required|string|max_length[100]',
            'yandexMap'         => 'required|string|max_length[100]',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$file || !$file->isValid()) {
            return $this->failValidationErrors('File upload failed or invalid file');
        }

        // Check input data validation rules
        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $eventId = uniqid();
            $event   = new EventEntity();
            $event->id = $eventId;
            $event->title_ru    = $input['title'];
            $event->max_tickets = $input['tickets'];
            $event->googleMap   = $input['googleMap'];
            $event->yandexMap   = $input['yandexMap'];

            if ($file) {
                $image = Services::image('gd');

                $directoryPath = UPLOAD_EVENTS . $eventId;
                mkdir($directoryPath, 0755, true);

                $fileName = 'cover';
                $fileExtension = $file->getExtension();
                $fileFullName  = $fileName . '.' . $fileExtension;

                $file->move($directoryPath, $fileFullName);

                // Создаем превью 585 (сначала уменьшаем, потом обрезаем)
                $mediumFileName = $fileName . '_preview.' . $fileExtension;
                $image->withFile($directoryPath . '/' . $fileFullName)
                      ->fit(585, 400, 'center') // Уменьшаем до 585x400, сохраняя пропорции
                      ->save($directoryPath . '/' . $mediumFileName);

                $event->coverFileName  = $fileName;
                $event->coverFileExt   = $fileExtension;
            }

            // Преобразуем дату события в UTC
            $eventDate = Time::parse($input['date'], 'Asia/Yekaterinburg');
            $event->date = $eventDate->setTimezone('UTC')->toDateTimeString();

            // Преобразуем дату начала регистрации в UTC
            $registrationStartDate = Time::parse($input['registrationStart'], 'Asia/Yekaterinburg');
            $event->registration_start = $registrationStartDate->setTimezone('UTC')->toDateTimeString();

            // Преобразуем дату окончания регистрации в UTC
            $registrationEndDate = Time::parse($input['registrationEnd'], 'Asia/Yekaterinburg');
            $event->registration_end = $registrationEndDate->setTimezone('UTC')->toDateTimeString();

            $this->model->save($event);

            return $this->respondCreated($event);
        } catch (\Exception $e) {
            log_message('error', $e->getMessage());
            return $this->failServerError('Could not save photo data');
        }

        return $this->respond();
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

        $eventPhotosModel = new EventsPhotosModel();

        $photo = new EventPhotoEntity();
        $photo->event_id  = $eventData->id;
        $photo->user_id   = $this->session->user?->id;
        $photo->title_ru  = $eventData->title_ru;
        $photo->title_en  = $eventData->title_en;
        $photo->file_name = $name;
        $photo->file_ext  = $ext;
        $photo->file_size = $file->getSize();
        $photo->image_width  = $width;
        $photo->image_height = $height;

        $eventPhotosModel->insert($photo);
        return $this->respondCreated((object) [
            'name'    => $name,
            'ext'     => $ext,
            'width'   => $photo->image_width,
            'height'  => $photo->image_height,
            'title'   => $photo->title_ru,
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
