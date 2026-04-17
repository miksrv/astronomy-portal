<?php

namespace App\Controllers;

use App\Entities\EventEntity;
use App\Entities\EventPhotoEntity;
use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Libraries\TelegramLibrary;
use App\Models\EventsPhotosModel;
use App\Models\EventsUsersModel;
use App\Models\UsersModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\I18n\Time;
use CodeIgniter\Files\File;
use Config\Services;

//use Longman\TelegramBot\Exception\TelegramException;

use ReflectionException;
use Exception;

/**
 * Class Events
 * @package App\Controllers
 *
 * @method ResponseInterface upcoming() Retrieves the upcoming event details.
 * @method ResponseInterface checkin($id = null) Checks in a user for an event by its ID.
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
        LocaleLibrary::init();

        $this->session = new SessionLibrary();
        $this->model   = new \App\Models\EventsModel();
    }

    public function upcoming(): ResponseInterface
    {
        try {
            $locale    = $this->request->getLocale();
            $eventData = $this->model->getUpcomingEvent($locale);

            if (empty($eventData)) {
                return $this->respond('');
            }

            $eventUsersModel = new EventsUsersModel();
            $bookedEvents    = $this->session->isAuth && $this->session->user->id
                ? $eventUsersModel->where(['event_id' => $eventData->id, 'user_id' => $this->session->user->id])->first()
                : false;

            $currentTickets = $eventUsersModel
                ->selectSum('adults')
                // ->selectSum('children')
                ->where('event_id', $eventData->id)
                ->first();

            // $currentTickets = $currentTickets->adults + $currentTickets->children;
            $currentTickets = (int) $currentTickets->adults;

            $eventData->registered = false;

            if ($bookedEvents) {
                $eventData->registered = true;
                $eventData->bookedId   = $bookedEvents->id;
                $eventData->canceled   = !empty($bookedEvents->deleted_at);
                $eventData->members    = [
                    'adults'   => $bookedEvents->adults ?? 0,
                    'children' => $bookedEvents->children ?? 0
                ];
            } else {
                unset($eventData->location);
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
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * Returns the next upcoming event the authenticated user is registered for.
     */
    public function upcomingRegistered(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized('Unauthorized');
        }

        $eventUsersModel = new EventsUsersModel();
        $row = $eventUsersModel->getUpcomingRegisteredEvent($this->session->user->id);

        $item = null;

        if ($row) {
            $item = [
                'id'             => $row->id,
                'titleRu'        => $row->title_ru,
                'titleEn'        => $row->title_en,
                'date'           => $row->date,
                'coverFileName'  => $row->cover_file_name,
                'coverFileExt'   => $row->cover_file_ext,
                'locationRu'     => $row->location_ru,
                'locationEn'     => $row->location_en,
                'yandexMapLink'  => $row->yandex_map_link,
                'googleMapLink'  => $row->google_map_link,
                'adults'         => (int) $row->adults,
                'children'       => (int) $row->children,
                'checkinAt'      => $row->checkin_at,
            ];
        }

        return $this->respond(['item' => $item]);
    }

    /**
     * Checks in a user for an event by its ID.
     *
     * Validates user permissions, retrieves the event data, checks if the user has booked the event,
     * and updates the check-in status if applicable. Returns a response with check-in status and member details.
     *
     * Response Format:
     * - checkin: datetime
     * - members: {
     *     adults: int
     *     children: int
     * }
     *
     * @param int|null $id The ID of the booked event.
     * @return ResponseInterface JSON response with check-in status and member details or an error message.
     */
    public function checkin($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if (!in_array($this->session->user->role, ['admin', 'moderator', 'security'])) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        try {
            $response  = [];
            $locale    = $this->request->getLocale();
            $eventData = $this->model->getUpcomingEvent($locale);

            if (empty($id) || empty($eventData)) {
                return $this->failValidationErrors(lang('Events.noUpcomingEvents'));
            }

            $eventUsersModel  = new EventsUsersModel();
            $bookedEventsData = $eventUsersModel->where(['id' => $id])->first();

            if (empty($bookedEventsData)) {
                return $this->failValidationErrors(lang('Events.invalidQrCode'));
            }

            if (empty($bookedEventsData->checkin_at)) {
                $eventUsersModel->update($id, [
                    'checkin_at'         => new Time('now'),
                    'checkin_by_user_id' => $this->session->user->id
                ]);
            } else {
                $response['checkin'] = $bookedEventsData->checkin_at;
            }

            $response['members'] = [
                'adults'   => $bookedEventsData->adults ?? 0,
                'children' => $bookedEventsData->children ?? 0
            ];

            return $this->respond($response);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
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

            $eventUsersModel = new EventsUsersModel();
            $usersData = $eventUsersModel->getUsersCountGroupedByEventId();

            // Convert $usersData to an associative array for fast lookup by event_id
            $usersDataByEventId = [];
            foreach ($usersData as $item) {
                $usersDataByEventId[$item->event_id] = $item;
            }

            foreach ($result as $event) {
                if (isset($usersDataByEventId[$event->id])) {
                    $item = $usersDataByEventId[$event->id];
                    $event->members = (object) [
                        'total'    => $item->total_adults + $item->total_children,
                        'adults'   => $item->total_adults ?? 0,
                        'children' => $item->total_children ?? 0
                    ];
                }
            }

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
        $order  = $this->request->getGet('order', FILTER_SANITIZE_FULL_SPECIAL_CHARS, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);
        $event  = $this->request->getGet('eventId', FILTER_SANITIZE_FULL_SPECIAL_CHARS, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);

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

            $eventUsersModel = new EventsUsersModel();
            $usersCount = $eventUsersModel->getUsersCountByEventId($id);

            if ($usersCount->total_adults || $usersCount->total_children) {
                $result[0]->members = (object) [
                    'total'    => $usersCount->total_adults + $usersCount->total_children,
                    'adults'   => $usersCount->total_adults ?? 0,
                    'children' => $usersCount->total_children ?? 0
                ];
            }

            // Incrementing view counter
            $this->model->incrementViews($id);

            return $this->respond($result[0]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * Returns the list of users registered for a specific event.
     *
     * @param int|null $id The event ID.
     * @return ResponseInterface JSON response with the list of users or a server error on failure.
     */
    public function members($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        try {
            $eventUsersModel = new EventsUsersModel();
            $users = $eventUsersModel->getUsersByEventId($id);

            return $this->respond($users);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * Creates a new event with the provided details.
     *
     * Validates user permissions and input data, processes the uploaded cover image,
     * converts event and registration dates to UTC, and saves the event.
     * Returns the created event data or an error response on failure.
     *
     * @return ResponseInterface JSON response with the created event or error message.
     */
    public function create(): ResponseInterface {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
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
            return $this->failValidationErrors(lang('General.fileUploadFailed'));
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!in_array($file->getMimeType(), $allowedMimes, true)) {
            return $this->failValidationErrors(lang('General.invalidFileType'));
        }

        // Check input data validation rules
        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $event = new EventEntity();
            $event->id          = uniqid();
            $event->title_ru    = $input['title'];
            $event->title_en    = $input['title'];
            $event->content_ru  = $input['content'];
            $event->content_en  = $input['content'];
            $event->max_tickets = $input['tickets'];
            $event->googleMap   = $input['googleMap'];
            $event->yandexMap   = $input['yandexMap'];

            if ($file) {
                $image = Services::image('gd');

                $directoryPath = UPLOAD_EVENTS . $event->id;
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
            return $this->failServerError(lang('General.couldNotSaveData'));
        }
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
            'phone'    => 'if_exist|min_length[6]|max_length[40]',
            'adults'   => 'required|integer|greater_than[0]|less_than[6]',
            'children' => 'integer|greater_than[-1]|less_than[6]'
        ];

        $this->validator = Services::Validation()->setRules($rules);

        // Check input data validation rules
        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $event = $this->model->find($input['eventId']);
            // Check that event with ID is exists
            if (!$event) {
                return $this->failValidationErrors(['error' => lang('Events.notExists')]);
            }

            $eventUsersModel = new EventsUsersModel();

            // Check that user not already registered at this event
            // withDeleted()
            if ($eventUsersModel->where(['event_id' => $input['eventId'], 'user_id' => $this->session->user->id])->first()) {
                return $this->failValidationErrors(['error' => lang('Events.alreadyRegistered')]);
            }

            // Check registration start and end dates
            $currentTime   = new Time('now');
            $timeDiffStart = $currentTime->difference($event->registration_start);
            $timeDiffEnd   = $currentTime->difference($event->registration_end);

            if ($timeDiffStart->getSeconds() >= 0 || $timeDiffEnd->getSeconds() <= 0) {
                return $this->failValidationErrors(['error' => lang('Events.registrationClosed')]);
            }

            // Check available tickets
            $currentTickets = $eventUsersModel
                ->selectSum('adults')
                ->selectSum('children')
                ->where('event_id', $input['eventId'])
                ->first();

            // $currentTickets = $currentTickets->adults + $currentTickets->children;
//            $totalMembers   = (int) $currentTickets->adults + (int) $currentTickets->children;
            $currentTickets = (int) $currentTickets->adults;

            if ($currentTickets >= (int) $event->max_tickets) {
                return $this->failValidationErrors(['error' => lang('Events.noTicketsAvailable')]);
            }

            $childrenAges = $input['childrenAges'] ?? [];
            $eventUsersModel->insert([
                'event_id' => $input['eventId'],
                'user_id'  => $this->session->user->id,
                'adults'   => $input['adults'],
                'children' => $input['children'],

                'children_ages' => json_encode($childrenAges),
            ]);

//            $safeName       = htmlspecialchars($input['name'] ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
//            $safeEventTitle = htmlspecialchars($event->title_ru ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
//            $message = "<b>🙋РЕГИСТРАЦИЯ НА АСТРОВЫЕЗД</b>\n" .
//                "<b>{$safeEventTitle}</b>\n" .
//                "🔹<i>{$safeName}</i>\n" .
//                "🔹(<b>{$input['adults']}</b>) взрослых, ({$input['children']}) детей\n" .
//                (count($childrenAges) > 0 ? "🔹Возраст детей <b>" . implode(', ', $childrenAges) . "</b> (лет)\n" : "") .
//                "🔹Доступно мест <b>" . ($event->max_tickets - ($currentTickets + (int) $input['adults'])) . "</b> из <b>{$event->max_tickets}</b>\n" .
//                "🔹Всего участников: <b>" . ($totalMembers + (int) $input['adults'] + (int) $input['children']) . "</b>";
//
//            (new TelegramLibrary())->sendMessage($message);

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

            return $this->respond(['message' => lang('Events.bookingSuccess')]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

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

        try {
            $event = $this->model->find($input['eventId']);
            // Check that event with ID is exists
            if (!$event) {
                return $this->failValidationErrors(['error' => lang('Events.notExists')]);
            }

            $eventUsersModel  = new EventsUsersModel();
            $userRegistration = $eventUsersModel->where(['event_id' => $input['eventId'], 'user_id' => $this->session->user->id])->first();

            // Check that user not already registered at this event
            if (empty($userRegistration)) {
                return $this->failValidationErrors(['error' => lang('Events.notRegistered')]);
            }

            // Check registration start and end dates
            $currentTime   = new Time('now');
            $timeDiffStart = $currentTime->difference($event->registration_start);
            $timeDiffEnd   = $currentTime->difference($event->registration_end);

            if ($timeDiffStart->getSeconds() >= 0 || $timeDiffEnd->getSeconds() <= 0) {
                return $this->failValidationErrors(['error' => lang('Events.registrationClosed')]);
            }

            // Check available tickets
//            $currentTickets = $eventUsersModel
//                ->selectSum('adults')
//                ->where('event_id', $input['eventId'])
//                ->first();

            $eventUsersModel->delete($userRegistration->id);

//            $safeCancelName  = htmlspecialchars($this->session->user->name ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
//            $safeCancelTitle = htmlspecialchars($event->title_ru ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');

//            $cancelMessage = "<b>❌ ОТМЕНА БРОНИРОВАНИЯ</b>\n" .
//                "<b>{$safeCancelTitle}</b>\n" .
//                "🔹<i>{$safeCancelName}</i>\n" .
//                "🔹Взрослых: <b>{$userRegistration->adults}</b>, детей: {$userRegistration->children}\n" .
//                "🔹Осталось слотов: <b>" . ($event->max_tickets - (abs($currentTickets->adults - (int) $userRegistration->adults))) . "</b>\n";
//
//            (new TelegramLibrary())->sendMessage($cancelMessage);

            return $this->respond(['message' => lang('Events.cancelSuccess')]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * Uploading a photo by place ID
     * @param null $id
     * @return ResponseInterface
     * @throws ReflectionException
     */
    public function upload($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $photo = $this->request->getFile('photo');
        if (!$photo || !$photo->isValid()) {
            return $this->failValidationErrors(lang('General.fileUploadFailed'));
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!in_array($photo->getMimeType(), $allowedMimes, true)) {
            return $this->failValidationErrors(lang('General.invalidFileType'));
        }

        $eventData = $this->model->find($id);
        if (!$eventData || !$eventData->id) {
            return $this->failValidationErrors(lang('Events.notFound'));
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

        $imageService = Services::image('gd');
        $imageService->withFile($file->getRealPath())->reorient(true)->save(); // перезаписываем с ориентацией

        list($width, $height) = getimagesize($file->getRealPath());

        // Масштабирование большого изображения, если превышает лимит
        if ($width > PHOTO_MAX_WIDTH || $height > PHOTO_MAX_HEIGHT) {
            $imageService->withFile($file->getRealPath())
                ->resize(PHOTO_MAX_WIDTH, PHOTO_MAX_HEIGHT, true)
                ->save($eventDir . $name . '.' . $ext);

            list($width, $height) = getimagesize($file->getRealPath());
        }

        // Масштабирование превь изображения
        $imageService->withFile($file->getRealPath())
            ->reorient(true)
            ->resize(PHOTO_PREVIEW_WIDTH, PHOTO_PREVIEW_HEIGHT, true)
            ->save($eventDir . $name . '_preview.' . $ext);

        // Сохраняем в базу
        $photoEntity = new EventPhotoEntity([
            'event_id'     => $eventData->id,
            'user_id'      => $this->session->user?->id,
            'title_ru'     => $eventData->title_ru,
            'title_en'     => $eventData->title_en,
            'file_name'    => $name,
            'file_ext'     => $ext,
            'file_size'    => $file->getSize(),
            'image_width'  => $width,
            'image_height' => $height,
        ]);

        (new EventsPhotosModel())->insert($photoEntity);

        return $this->respondCreated((object)[
            'name'    => $name,
            'ext'     => $ext,
            'width'   => $width,
            'height'  => $height,
            'title'   => $photoEntity->title_ru,
            'eventId' => $photoEntity->event_id,
        ]);
    }

    /**
     * Replaces the cover image for an existing event.
     *
     * Accepts a multipart file upload under the 'upload' key, validates the MIME type,
     * saves it as cover.<ext> and generates a 585x400 preview as cover_preview.<ext>
     * inside the event's upload directory. Updates the DB record with the new file info.
     *
     * @param string|null $id The event ID.
     * @return ResponseInterface
     */
    public function cover($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $event = $this->model->find($id);

        if (!$event) {
            return $this->failNotFound();
        }

        $file = $this->request->getFile('upload');

        if (!$file || !$file->isValid()) {
            return $this->failValidationErrors(lang('General.fileUploadFailed'));
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!in_array($file->getMimeType(), $allowedMimes, true)) {
            return $this->failValidationErrors(lang('General.invalidFileType'));
        }

        try {
            $directoryPath = UPLOAD_EVENTS . $event->id;

            if (!is_dir($directoryPath)) {
                mkdir($directoryPath, 0755, true);
            }

            $ext          = $file->getExtension();
            $fileName     = 'cover';
            $fileFullName = $fileName . '.' . $ext;
            $previewName  = $fileName . '_preview.' . $ext;

            $file->move($directoryPath, $fileFullName, true);

            Services::image('gd')
                ->withFile($directoryPath . '/' . $fileFullName)
                ->fit(585, 400, 'center')
                ->save($directoryPath . '/' . $previewName);

            $this->model->update($id, [
                'cover_file_name' => $fileName,
                'cover_file_ext'  => $ext,
            ]);

            return $this->respondUpdated([
                'coverFileName' => $fileName,
                'coverFileExt'  => $ext,
            ]);
        } catch (Exception $e) {
            log_message('error', $e->getMessage());
            return $this->failServerError(lang('General.serverError'));
        }
    }

    public function delete($id = null): ResponseInterface {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        try {
            $eventData = $this->model->find($id);

            if (!$eventData) {
                return $this->failNotFound();
            }

            $this->model->delete($id);

            return $this->respondDeleted($eventData);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * Update an existing event.
     *
     * @param string|null $id The event ID.
     * @return ResponseInterface
     */
    public function update($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $eventData = $this->model->find($id);

        if (!$eventData) {
            return $this->failNotFound();
        }

        $input = $this->request->getJSON(true);

        $rules = [
            'title'             => 'if_exist|string|max_length[250]',
            'content'           => 'if_exist|string',
            'tickets'           => 'if_exist|integer|greater_than[0]|less_than[5000]',
            'date'              => 'if_exist|string|max_length[50]',
            'registrationStart' => 'if_exist|string|max_length[50]',
            'registrationEnd'   => 'if_exist|string|max_length[50]',
            'googleMap'         => 'if_exist|string|max_length[100]',
            'yandexMap'         => 'if_exist|string|max_length[100]',
            'location'          => 'if_exist|string|max_length[250]',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $updateData = [];

            if (isset($input['title'])) {
                $updateData['title_ru'] = $input['title'];
                $updateData['title_en'] = $input['title'];
            }

            if (isset($input['content'])) {
                $updateData['content_ru'] = $input['content'];
                $updateData['content_en'] = $input['content'];
            }

            if (isset($input['tickets'])) {
                $updateData['max_tickets'] = $input['tickets'];
            }

            if (isset($input['date'])) {
                $updateData['date'] = Time::parse($input['date'], 'Asia/Yekaterinburg')
                    ->setTimezone('UTC')
                    ->toDateTimeString();
            }

            if (isset($input['registrationStart'])) {
                $updateData['registration_start'] = Time::parse($input['registrationStart'], 'Asia/Yekaterinburg')
                    ->setTimezone('UTC')
                    ->toDateTimeString();
            }

            if (isset($input['registrationEnd'])) {
                $updateData['registration_end'] = Time::parse($input['registrationEnd'], 'Asia/Yekaterinburg')
                    ->setTimezone('UTC')
                    ->toDateTimeString();
            }

            if (isset($input['googleMap'])) {
                $updateData['google_map_link'] = $input['googleMap'];
            }

            if (isset($input['yandexMap'])) {
                $updateData['yandex_map_link'] = $input['yandexMap'];
            }

            if (isset($input['location'])) {
                $updateData['location_ru'] = $input['location'];
                $updateData['location_en'] = $input['location'];
            }

            if (!empty($updateData)) {
                $this->model->update($id, $updateData);
            }

            return $this->respondUpdated($this->model->find($id));
        } catch (Exception $e) {
            log_message('error', $e->getMessage());
            return $this->failServerError(lang('General.serverError'));
        }
    }
}
