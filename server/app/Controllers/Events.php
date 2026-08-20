<?php

namespace App\Controllers;

use App\Entities\EventEntity;
use App\Entities\EventPhotoEntity;
use App\Entities\PaymentEntity;
use App\Enums\Permission;
use App\Libraries\CalendarLibrary;
use App\Libraries\LocaleLibrary;
use App\Libraries\PaymentLibrary;
use App\Libraries\SessionLibrary;
use App\Libraries\TicketLibrary;
use App\Models\CommentsModel;
use App\Models\EmailQueueModel;
use App\Models\EventsPhotosModel;
use App\Models\EventsUsersModel;
use App\Models\PaymentsModel;
use App\Models\UsersModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\I18n\Time;
use CodeIgniter\Files\File;
use Config\Database;
use Config\Services;

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
 * @method ResponseInterface statistic($id = null) Returns aggregated statistics for an event.
 */
class Events extends BaseApiController
{
    // Default venue coordinates, used when a new event is created without an
    // explicit pin (matches the `events` table column defaults).
    private const DEFAULT_LATITUDE  = 51.8250225;
    private const DEFAULT_LONGITUDE = 55.7107200;

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

            // Free seats held by expired, unpaid reservations before counting
            // tickets or resolving the current user's booking state, so a stale
            // pending booking does not linger or occupy capacity.
            $this->releaseExpiredBookings($eventUsersModel, new PaymentLibrary());

            $bookedEvents    = $this->session->isAuth && $this->session->user->id
                ? $eventUsersModel->where(['event_id' => $eventData->id, 'user_id' => $this->session->user->id])->first()
                : false;

            $currentTickets = $eventUsersModel
                ->selectSum('adults')
                // ->selectSum('children')
                ->where('event_id', $eventData->id)
                ->whereIn('status', ['pending', 'confirmed'])
                ->first();

            // $currentTickets = $currentTickets->adults + $currentTickets->children;
            $currentTickets = (int) $currentTickets->adults;

            $eventData->registered = false;

            if ($bookedEvents) {
                $eventData->registered    = true;
                $eventData->bookedId      = $bookedEvents->id;
                $eventData->bookingStatus = $bookedEvents->status;
                $eventData->canceled      = !empty($bookedEvents->deleted_at);
                $eventData->members       = [
                    'adults'       => $bookedEvents->adults ?? 0,
                    'children'     => $bookedEvents->children ?? 0,
                    // Exposed so a declined/expired payment can be retried
                    // (new order for the same resurrected booking) without
                    // re-entering the children's ages.
                    'childrenAges' => $bookedEvents->children_ages ?? []
                ];

                // A pending booking holds the seat until its payment expires.
                // Expose the order so the UI can show a countdown and a
                // "return to payment" button that resumes the same Alfa-Bank order.
                if ($bookedEvents->status === 'pending' && !empty($bookedEvents->payment_id)) {
                    $payment = (new PaymentsModel())->find($bookedEvents->payment_id);

                    if ($payment && $payment->status === 'pending') {
                        // Send remaining seconds, not an absolute timestamp: the
                        // stored value is app-timezone wall-clock and serialising
                        // it lets the client misread the zone. A server-computed
                        // diff (absolute timestamps) is timezone-proof.
                        $expiresInSeconds = max(
                            0,
                            Time::parse((string) $payment->expires_at, 'UTC')->getTimestamp() - Time::now('UTC')->getTimestamp()
                        );

                        $eventData->payment = [
                            'orderId'          => $payment->order_id,
                            'formUrl'          => $payment->form_url,
                            'expiresInSeconds' => $expiresInSeconds,
                        ];
                    }
                }
            } else {
                unset($eventData->address, $eventData->latitude, $eventData->longitude);
            }

            $eventData->max_tickets = $eventData->max_tickets - $currentTickets;

            if ($eventData->max_tickets < 0) {
                $eventData->max_tickets = 0;
            }

            unset($eventData->created_at, $eventData->updated_at, $eventData->deleted_at);

            return $this->respond($eventData);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * Returns the next upcoming event the authenticated user is registered for.
     */
    public function upcomingRegistered(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized();
        }

        $locale = $this->request->getLocale();

        $eventUsersModel = new EventsUsersModel();
        $booking = $eventUsersModel->getUpcomingRegisteredBooking($this->session->user->id);

        if (empty($booking)) {
            return $this->respond(['item' => null]);
        }

        // Locale-resolved, camelCased event data — same shape as every other
        // event response (Events::show(), Events::upcoming()) — so the client
        // can reuse the same components regardless of which endpoint served it.
        $eventData = $this->model->getPastEventsList($locale, $booking->event_id);

        if (empty($eventData)) {
            return $this->respond(['item' => null]);
        }

        $event = $eventData[0];

        $event->bookedId      = $booking->booking_id;
        $event->registered    = true;
        $event->bookingStatus = $booking->status;
        $event->members       = [
            'adults'   => (int) $booking->adults,
            'children' => (int) $booking->children
        ];

        // A pending booking still holds its seat on a payment timer — expose the
        // order so the profile can render the same countdown / "return to
        // payment" panel as the stargazing page, instead of showing nothing
        // while the payment is still being reconciled (e.g. the user paid but
        // closed the bank tab before it redirected back).
        if ($booking->status === 'pending' && !empty($booking->payment_id)) {
            $payment = (new PaymentsModel())->find($booking->payment_id);

            if ($payment && $payment->status === 'pending') {
                $expiresInSeconds = max(
                    0,
                    Time::parse((string) $payment->expires_at, 'UTC')->getTimestamp() - Time::now('UTC')->getTimestamp()
                );

                $event->payment = [
                    'orderId'          => $payment->order_id,
                    'formUrl'          => $payment->form_url,
                    'expiresInSeconds' => $expiresInSeconds
                ];
            }
        }

        return $this->respond(['item' => $event]);
    }

    /**
     * Checks in a user for an event by its booking ID, or — for the booking's
     * own owner — resolves which event a ticket belongs to.
     *
     * The ticket QR now links straight to `/stargazing/checkin/:id` on the
     * frontend, which always calls this endpoint regardless of who opened it:
     * - Staff (admin/moderator/security): performs the actual check-in (or
     *   reports it as already done) and returns the guest's name + member
     *   counts, same as before.
     * - Anyone else (typically the guest scanning their own ticket): no side
     *   effects — just returns the booking's `eventId` so the frontend can
     *   redirect them to the event page instead of the staff flow.
     *
     * Response Format (staff):
     * - checkin: datetime
     * - name: string
     * - members: { adults: int, children: int }
     *
     * Response Format (non-staff, own booking):
     * - eventId: string
     *
     * @param int|null $id The booking ID (events_users.id).
     * @return ResponseInterface JSON response with check-in status and member details or an error message.
     */
    public function checkin($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized();
        }

        try {
            if (empty($id)) {
                return $this->respondError(lang('Events.invalidQrCode'));
            }

            $eventUsersModel  = new EventsUsersModel();
            $bookedEventsData = $eventUsersModel->where(['id' => $id])->first();

            if (empty($bookedEventsData)) {
                return $this->respondError(lang('Events.invalidQrCode'));
            }

            $isStaff = $this->session->can(Permission::EVENTS_CHECKIN);

            // Not staff — presumably the guest who scanned their own ticket's
            // QR. No side effects, no access to anyone else's booking; just
            // hand back the event id so the frontend can redirect them there.
            if (!$isStaff) {
                if ($bookedEventsData->user_id !== $this->session->user->id) {
                    return $this->respondForbidden();
                }

                return $this->respond(['eventId' => $bookedEventsData->event_id]);
            }

            $locale    = $this->request->getLocale();
            $eventData = $this->model->getUpcomingEvent($locale);

            if (empty($eventData)) {
                return $this->respondConflict(lang('Events.noUpcomingEvents'));
            }

            // The QR must belong to the currently upcoming event — not to a
            // different (past, future, or already-superseded) one.
            if ($bookedEventsData->event_id !== $eventData->id) {
                return $this->respondError(lang('Events.invalidQrCode'));
            }

            // Only a paid/confirmed booking is a valid entry ticket — a
            // still-pending (unpaid) or failed booking must not check in.
            if ($bookedEventsData->status !== 'confirmed') {
                return $this->respondConflict(lang('Events.bookingNotConfirmed'));
            }

            $response = [];

            if (empty($bookedEventsData->checkin_at)) {
                $eventUsersModel->update($id, [
                    'checkin_at'         => new Time('now', 'UTC'),
                    'checkin_by_user_id' => $this->session->user->id
                ]);
            } else {
                $response['checkin'] = $bookedEventsData->checkin_at;
            }

            // Real, DB-sourced name — lets staff visually compare it against
            // the guest's ID, regardless of what a screenshotted ticket shows.
            $owner = (new UsersModel())->find($bookedEventsData->user_id);

            $response['name']    = $owner->name ?? null;
            $response['members'] = [
                'adults'   => $bookedEventsData->adults ?? 0,
                'children' => $bookedEventsData->children ?? 0
            ];

            return $this->respond($response);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * Streams the PNG ticket for a booking (events_users id), generated on the fly.
     *
     * Nothing is stored on disk. Access is restricted to the booking owner or to
     * staff (admin/moderator/security). Soft-deleted (cancelled) bookings 404.
     *
     * @param string|null $id The booking id (events_users.id); the QR itself encodes the check-in URL, not this id directly.
     */
    public function ticket($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized();
        }

        if (empty($id)) {
            return $this->respondError(lang('Events.invalidQrCode'));
        }

        try {
            $eventUsersModel = new EventsUsersModel();
            $booking         = $eventUsersModel->find($id);

            if (empty($booking)) {
                return $this->respondNotFound(lang('Events.notFound'));
            }

            $isStaff = $this->session->can(Permission::EVENTS_CHECKIN);

            if (!$isStaff && $booking->user_id !== $this->session->user->id) {
                return $this->respondForbidden();
            }

            // A pending (unpaid) or failed booking is not a valid ticket —
            // it must not render a scannable QR that would pass check-in.
            if ($booking->status !== 'confirmed') {
                return $this->respondConflict(lang('Events.bookingNotConfirmed'));
            }

            $event = $this->model->find($booking->event_id);

            if (empty($event)) {
                return $this->respondNotFound(lang('Events.notFound'));
            }

            // Guest name: the booking owner (resolve from DB when staff views someone else's ticket).
            $userName = $this->session->user->name ?? null;

            if ($booking->user_id !== $this->session->user->id) {
                $owner    = (new UsersModel())->find($booking->user_id);
                $userName = $owner->name ?? null;
            }

            $data = $this->buildTicketData($booking, $event, $userName, $this->request->getLocale());
            $png  = (new TicketLibrary())->renderPng($data);

            return $this->response
                ->setHeader('Content-Type', 'image/png')
                ->setHeader('Cache-Control', 'private, max-age=300')
                ->setBody($png);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * Assembles the localised data array consumed by {@see TicketLibrary::renderPng()}.
     *
     * Presentation strings are resolved here (labels via lang(), title via the
     * locale helper, date formatted in Orenburg time to match the rest of the UI).
     *
     * @param object      $booking  events_users row.
     * @param EventEntity $event    The event the booking belongs to.
     * @param string|null $userName Guest display name.
     * @param string      $locale   Locale code ('ru' | 'en').
     */
    private function buildTicketData(object $booking, EventEntity $event, ?string $userName, string $locale): array
    {
        helper('locale');

        $rawEvent = $event->toRawArray();
        $rawDate  = $rawEvent['date'] ?? null;
        $dateLine = '';
        $timeLine = '';

        if (!empty($rawDate)) {
            // Stored as UTC; display in Orenburg time (UTC+5), like the rest of the UI.
            // Locale is passed explicitly to Time::parse() so the formatted
            // string doesn't depend on whatever locale the current request
            // happens to be negotiated to.
            $startTime   = Time::parse($rawDate, 'UTC', $locale)->setTimezone('Asia/Yekaterinburg');
            $rawDateLine = $startTime->toLocalizedString(lang('Events.ticketDateLine', [], $locale));
            $dateLine    = mb_strtoupper(mb_substr($rawDateLine, 0, 1)) . mb_substr($rawDateLine, 1);
            $timeLine    = $startTime->toLocalizedString('HH:mm');

            $rawEndDate = $rawEvent['end_date'] ?? null;

            if (!empty($rawEndDate)) {
                $endTime   = Time::parse($rawEndDate, 'UTC', $locale)->setTimezone('Asia/Yekaterinburg');
                $timeLine .= ' — ' . $endTime->toLocalizedString('HH:mm');
            }
        }

        $childrenValue = (int) $booking->children > 0
            ? lang('Events.ticketChildrenValue', [(int) $booking->children], $locale)
            : '';

        $checkinUrl = rtrim((string) getenv('app.siteUrl'), '/') . '/stargazing/checkin/' . $booking->id;

        return [
            'qrData'            => $checkinUrl,
            'heading'           => lang('Events.ticketHeading', [], $locale),
            'title'             => getLocalizedString($locale, $event->title_en, $event->title_ru),
            'dateLine'          => $dateLine,
            'timeLine'          => $timeLine,
            'locationValue'     => trim((string) ($event->location ?? '')),
            'addressValue'      => trim((string) ($event->address ?? '')),
            'orderValue'        => strtoupper((string) $booking->id),
            'guestValue'        => $userName ?? '',
            'participantsLabel' => lang('Events.ticketParticipantsLabel', [], $locale),
            'adultsValue'       => lang('Events.ticketAdultsValue', [(int) $booking->adults], $locale),
            'childrenValue'     => $childrenValue,
        ];
    }

    /**
     * Builds the Yandex/Google map links for an event's coordinates — the
     * server-side equivalent of `client/utils/maps.ts`, used for the ticket
     * confirmation email (which is plain HTML, not a rendered `EventMap`).
     *
     * @return array{yandex: ?string, google: ?string}
     */
    private function buildEventMapLinks(EventEntity $event): array
    {
        $latitude  = $event->latitude;
        $longitude = $event->longitude;

        if ($latitude === null || $longitude === null) {
            return ['yandex' => null, 'google' => null];
        }

        return [
            'yandex' => sprintf('https://yandex.ru/maps/?pt=%s,%s&z=16&l=map', $longitude, $latitude),
            'google' => sprintf('https://www.google.com/maps?q=%s,%s', $latitude, $longitude),
        ];
    }

    /**
     * Renders the PNG ticket and queues a confirmation email (with the ticket
     * embedded) to the booking owner for asynchronous delivery by the
     * `system:send-email` cron. The PNG is written to a durable file the cron
     * deletes once sent. Enqueue failures are logged but never bubble up —
     * a failed email must not break the booking/payment flow.
     *
     * The email itself is Russian-only (no i18n) — see `Views/email_ticket.php`.
     */
    private function queueTicketEmail(object $booking, EventEntity $event, ?string $toEmail, ?string $userName): void
    {
        if (empty($toEmail)) {
            return;
        }

        $ticketPath = null;
        $icsPath    = null;

        try {
            $data = $this->buildTicketData($booking, $event, $userName, 'ru');

            // Persist the ticket outside the request lifecycle so the cron can
            // attach it later; it is removed by the cron after the send.
            $ticketDir = WRITEPATH . 'email_attachments';

            if (!is_dir($ticketDir)) {
                mkdir($ticketDir, 0755, true);
            }

            $ticketPath = $ticketDir . '/ticket_' . $booking->id . '_' . uniqid() . '.png';
            file_put_contents($ticketPath, (new TicketLibrary())->renderPng($data));

            $rawEvent      = $event->toRawArray();
            $shortDate     = '';
            $gatheringLine = '';
            $endTimeValue  = '';

            if (!empty($rawEvent['date'])) {
                $startTime = Time::parse($rawEvent['date'], 'UTC', 'ru')->setTimezone('Asia/Yekaterinburg');
                $shortDate = $startTime->toLocalizedString('d MMMM');

                // Gathering window: a 1.5h window ending 30 minutes before the
                // event starts, e.g. event at 21:30 -> gathering 19:30-21:00.
                $gatheringStart = $startTime->modify('-2 hours')->toLocalizedString('HH:mm');
                $gatheringEnd   = $startTime->modify('-30 minutes')->toLocalizedString('HH:mm');
                $gatheringLine  = 'с ' . $gatheringStart . ' до ' . $gatheringEnd;
            }

            if (!empty($rawEvent['end_date'])) {
                $endTimeValue = Time::parse($rawEvent['end_date'], 'UTC', 'ru')
                    ->setTimezone('Asia/Yekaterinburg')
                    ->toLocalizedString('HH:mm');
            }

            $subject = 'Ваш билет на астровыезд' . ($shortDate !== '' ? ' (' . $shortDate . ')' : '');

            $dateTimeValue = trim($data['dateLine'] . (!empty($data['timeLine']) ? ', ' . $data['timeLine'] : ''));
            $mapLinks      = $this->buildEventMapLinks($event);

            $message = view('email_ticket', [
                'subject'        => $subject,
                'eventTitle'     => $event->title_ru,
                'dateTimeValue'  => $dateTimeValue,
                'gatheringLine'  => $gatheringLine,
                'endTimeValue'   => $endTimeValue,
                'locationValue'  => trim((string) ($event->location ?? '')),
                'addressValue'   => trim((string) ($event->address ?? '')),
                'yandexMapLink'  => $mapLinks['yandex'],
                'googleMapLink'  => $mapLinks['google'],
            ]);

            // Same .ics content the "Add to calendar" button builds client-side
            // (client/utils/calendar.ts) — see CalendarLibrary.
            $ics = (new CalendarLibrary())->buildEventIcs([
                'uid'       => (string) $booking->id,
                'title'     => (string) $event->title_ru,
                'start'     => (string) ($rawEvent['date'] ?? ''),
                'end'       => $rawEvent['end_date'] ?? null,
                'location'  => $event->location,
                'address'   => $event->address,
                'latitude'  => $event->latitude,
                'longitude' => $event->longitude,
                'pageUrl'   => rtrim((string) getenv('app.siteUrl'), '/') . '/stargazing/' . $event->id,
            ]);

            $icsPath = $ticketDir . '/event_' . $booking->id . '_' . uniqid() . '.ics';
            file_put_contents($icsPath, $ics);

            $queued = (new EmailQueueModel())->enqueue($toEmail, $subject, $message, $ticketPath, $icsPath);

            // If the row could not be inserted, drop the orphaned attachments.
            if (!$queued) {
                if (is_file($ticketPath)) {
                    @unlink($ticketPath);
                }

                if (is_file($icsPath)) {
                    @unlink($icsPath);
                }
            }
        } catch (\Throwable $e) {
            log_message('error', 'Ticket email enqueue failed: {msg}', ['msg' => $e->getMessage()]);

            if ($ticketPath !== null && is_file($ticketPath)) {
                @unlink($ticketPath);
            }

            if ($icsPath !== null && is_file($icsPath)) {
                @unlink($icsPath);
            }
        }
    }

    /**
     * Queues a booking-cancellation notice for asynchronous delivery.
     * Failures are logged, never thrown.
     */
    private function queueCancellationEmail(EventEntity $event, ?string $toEmail, ?string $locale): void
    {
        if (empty($toEmail)) {
            return;
        }

        helper('locale');

        $locale = $locale ?: 'ru';

        try {
            $title   = getLocalizedString($locale, $event->title_en, $event->title_ru);
            $subject = lang('Events.cancelEmailSubject', [$title], $locale);
            $message = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#1b1f27;">'
                . '<h2 style="margin:0 0 12px;">' . esc(lang('Events.cancelEmailTitle', [], $locale)) . '</h2>'
                . '<p style="margin:0;line-height:1.5;">' . esc(lang('Events.cancelEmailIntro', [$title], $locale)) . '</p>'
                . '</div>';

            (new EmailQueueModel())->enqueue($toEmail, $subject, $message);
        } catch (\Throwable $e) {
            log_message('error', 'Cancellation email enqueue failed: {msg}', ['msg' => $e->getMessage()]);
        }
    }

    /**
     * Notifies the customer after an admin-initiated forced refund (see
     * {@see refundRegistrationPayment()}) — same shape as
     * {@see queueCancellationEmail()}, but the copy explicitly confirms the
     * money is on its way back rather than just that the booking is gone.
     */
    private function queueRefundEmail(EventEntity $event, ?string $toEmail, ?string $locale): void
    {
        if (empty($toEmail)) {
            return;
        }

        helper('locale');

        $locale = $locale ?: 'ru';

        try {
            $title   = getLocalizedString($locale, $event->title_en, $event->title_ru);
            $subject = lang('Events.refundEmailSubject', [$title], $locale);
            $message = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#1b1f27;">'
                . '<h2 style="margin:0 0 12px;">' . esc(lang('Events.refundEmailTitle', [], $locale)) . '</h2>'
                . '<p style="margin:0;line-height:1.5;">' . esc(lang('Events.refundEmailIntro', [$title], $locale)) . '</p>'
                . '</div>';

            (new EmailQueueModel())->enqueue($toEmail, $subject, $message);
        } catch (\Throwable $e) {
            log_message('error', 'Refund email enqueue failed: {msg}', ['msg' => $e->getMessage()]);
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
        $userId = $this->request->getGet('userId', FILTER_SANITIZE_FULL_SPECIAL_CHARS, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);
        $userId = $userId !== '' ? $userId : null;

        $sessionUserId = $this->session->isAuth ? $this->session->user->id : null;

        // A `userId` that isn't the caller's own id is silently ignored — never
        // used to filter, never used to attach the viewer-scoped fields below.
        // Honouring an arbitrary id here (or even 403-ing on a mismatch) would
        // let anyone probe "was user X at event Y" / "did user X review it" for
        // any id; the only supported use is a user filtering their own history
        // (the profile page), which is why the check is an exact match against
        // the current session rather than a permission.
        $isOwnUserId = $userId !== null && $sessionUserId !== null && $userId === $sessionUserId;

        try {
            // Fetch data from models — filtered to $userId's own bookings only
            // when it's genuinely their own id; otherwise behaves exactly like
            // the plain, unfiltered call.
            $result = $this->model->getPastEventsList($locale, null, $isOwnUserId ? $userId : null);

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

            // Viewer-scoped "did I attend this event / did I already review
            // it" flags — attached for an authenticated session as long as it
            // isn't being asked to look through someone else's `userId` (see
            // above). This runs for a plain request too (not just the
            // self-filtered one), so the same cards on /stargazing and
            // /stargazing/history pick up a "Посещено"/review badge for any
            // event the logged-in viewer personally attended, not only inside
            // their filtered profile history.
            if ($sessionUserId !== null && ($userId === null || $isOwnUserId)) {
                $eventIds = array_map(static fn ($event) => $event->id, $result);

                $bookingsByEventId = [];
                foreach ($eventUsersModel->getBookingsForUserByEventIds($sessionUserId, $eventIds) as $booking) {
                    $bookingsByEventId[$booking->event_id] = $booking;
                }

                $reviewedEventIds = array_flip((new CommentsModel())->getReviewedEventIds($sessionUserId, $eventIds));

                foreach ($result as $event) {
                    if (isset($bookingsByEventId[$event->id])) {
                        $booking = $bookingsByEventId[$event->id];
                        $event->registered    = true;
                        $event->bookedId      = $booking->id;
                        $event->bookingStatus = $booking->status;
                    } else {
                        $event->registered = false;
                    }

                    $event->hasReviewed = isset($reviewedEventIds[$event->id]);
                }
            }

            // Return the response with count and items
            return $this->respond([
                'count' => count($result),
                'items' => $result
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * Retrieves a paginated list of event photos and returns them in a
     * structured response, mirroring the offset/limit + total pattern used by
     * `Comments::index()` — the frontend gallery loads the first page during
     * SSR and grows it further via "load more" / infinite scroll, rather than
     * fetching the whole (potentially hundreds-strong) gallery in one shot.
     *
     * Also includes the event's full, unfiltered list of distinct photographer
     * credits (`photographers`) — used for the gallery's filter chips and the
     * upload dialog's autocomplete. Bundled in here rather than a separate
     * endpoint since every caller that wants one already wants the other,
     * and it's always the same, cheap, `eventId`-scoped lookup regardless of
     * this request's own `limit`/`offset`/`photographer` filter.
     *
     * @return ResponseInterface Returns a JSON response with the total count, this page's items, and the event's distinct photographers, or an error message on failure.
     */
    public function photos(): ResponseInterface
    {
        $limit        = $this->request->getGet('limit', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $offset       = $this->request->getGet('offset', FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
        $order        = $this->request->getGet('order', FILTER_SANITIZE_FULL_SPECIAL_CHARS, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);
        $event        = $this->request->getGet('eventId', FILTER_SANITIZE_FULL_SPECIAL_CHARS, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);
        $photographer = $this->request->getGet('photographer', FILTER_SANITIZE_FULL_SPECIAL_CHARS, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);

        try {
            $eventPhotosModel = new EventsPhotosModel();

            // Fetch this page plus the true total (ignoring pagination) so the
            // client knows whether more pages remain.
            $result = $eventPhotosModel->getPhotoList($event, $limit, $offset, $order, $photographer);
            $total  = $eventPhotosModel->countPhotoList($event, $photographer);

            // Always the event's *full* photographer list, never narrowed by
            // $photographer - otherwise selecting one photographer would wipe
            // out the other filter chips.
            $photographers = $event ? $eventPhotosModel->getDistinctPhotographers($event) : [];

            return $this->respond([
                'total'         => $total,
                'items'         => $result,
                'photographers' => $photographers
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
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

        try {
            // Fetch data from models
            $result = $this->model->getPastEventsList($locale, $id);

            if (empty($result)) {
                return $this->respondNotFound();
            }

            $event = $result[0];

            $eventUsersModel = new EventsUsersModel();

            // The exact address and coordinates are only shown once the viewer
            // has a booking for the event — same rule as Events::upcoming().
            // `location` (general venue name) stays public. Past events have
            // nothing left to protect, so they're exempt. Staff who can edit
            // the event are exempt too — otherwise EVENTS_UPDATE staff editing
            // an event they haven't personally booked would see the address
            // field silently blank out on /stargazing/form (nothing wrong on
            // save, since the omitted field is just left unchanged there, but
            // confusing/misleading to look at while editing).
            if ($event->requiresRegistration && $this->model->isUpcoming($event)) {
                $canEditEvent = $this->session->isAuth && $this->session->can(Permission::EVENTS_UPDATE);

                $hasBooking = $this->session->isAuth && $this->session->user->id
                    ? $eventUsersModel->where(['event_id' => $id, 'user_id' => $this->session->user->id])->first()
                    : false;

                if (!$canEditEvent && !$hasBooking) {
                    unset($event->address, $event->latitude, $event->longitude);
                }
            }

            $usersCount = $eventUsersModel->getUsersCountByEventId($id);

            if ($usersCount->total_adults || $usersCount->total_children) {
                $event->members = (object) [
                    'total'    => $usersCount->total_adults + $usersCount->total_children,
                    'adults'   => $usersCount->total_adults ?? 0,
                    'children' => $usersCount->total_children ?? 0
                ];
            }

            // Incrementing view counter
            $this->model->incrementViews($id);

            return $this->respond($event);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
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
            return $this->respondUnauthorized();
        }

        if (!$this->session->can(Permission::EVENTS_USERS)) {
            return $this->respondForbidden();
        }

        try {
            $eventUsersModel = new EventsUsersModel();
            $users = $eventUsersModel->getUsersByEventId($id);

            return $this->respond($users);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * Returns aggregated statistics for a specific event.
     *
     * Restricted to users with the `admin` or `moderator` role.
     * Delegates all aggregation to EventsUsersModel::getStatisticByEventId().
     *
     * @param string|null $id The event ID.
     * @return ResponseInterface JSON response with aggregated statistics or an error on failure.
     */
    public function statistic($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized();
        }

        if (!$this->session->can(Permission::EVENTS_STATISTIC)) {
            return $this->respondForbidden();
        }

        try {
            if (empty($id)) {
                return $this->respondInvalidRequest('statistic() called without an event id');
            }

            $eventUsersModel = new EventsUsersModel();
            $statistic = $eventUsersModel->getStatisticByEventId($id);

            return $this->respond($statistic);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * Returns the full registration roster for an event — every status and
     * including cancelled (soft-deleted) rows — with payment/transaction
     * info, for the admin registrations table.
     *
     * Restricted to users with the `admin` or `moderator` role.
     *
     * @param string|null $id The event ID.
     * @return ResponseInterface JSON: { items: [...] }.
     */
    public function registrations($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized();
        }

        if (!$this->session->can(Permission::EVENTS_STATISTIC) || !$this->session->can(Permission::EVENTS_USERS)) {
            return $this->respondForbidden();
        }

        try {
            if (empty($id)) {
                return $this->respondInvalidRequest('registrations() called without an event id');
            }

            $rows = (new EventsUsersModel())->getRegistrationsByEventId($id);

            $items = array_map(static fn (array $r): array => [
                'id'                   => $r['id'],
                'userId'               => $r['user_id'],
                'name'                 => $r['name'],
                'email'                => $r['email'],
                'adults'               => (int) $r['adults'],
                'children'             => (int) $r['children'],
                'childrenAges'         => json_decode($r['children_ages'] ?? '[]', true) ?: [],
                'status'               => $r['status'],
                'createdAt'            => $r['created_at'],
                'checkinAt'            => $r['checkin_at'],
                'deletedAt'            => $r['deleted_at'],
                'paymentId'            => $r['payment_id'],
                'paymentOrderId'       => $r['payment_order_id'],
                'paymentStatus'        => $r['payment_status'],
                'paymentErrorMessage'  => $r['payment_error_message'],
            ], $rows);

            return $this->respond(['items' => $items]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * Re-queries the payment gateway for a registration's linked payment and
     * reconciles both the `payments` and `events_users` rows with the result
     * (via the same {@see reconcileBooking()} logic used by the customer-
     * facing payment status poll and the gateway callback). Lets staff fix a
     * booking that is stuck 'pending'/'failed' even though the bank actually
     * captured the payment, without needing direct DB access.
     *
     * Restricted to users with the `admin` or `moderator` role.
     *
     * @param string|null $id The registration (events_users) ID.
     * @return ResponseInterface JSON: { paymentStatus, registrationStatus, message }.
     */
    public function verifyRegistrationPayment($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized();
        }

        if (!$this->session->can(Permission::EVENTS_STATISTIC)) {
            return $this->respondForbidden();
        }

        try {
            if (empty($id)) {
                return $this->respondInvalidRequest('verifyRegistrationPayment() called without a registration id');
            }

            $eventUsersModel = new EventsUsersModel();
            $booking         = $eventUsersModel->withDeleted()->find($id);

            if ($booking === null) {
                return $this->respondNotFound(lang('Events.notRegistered'));
            }

            if (empty($booking->payment_id)) {
                return $this->respondConflict(lang('Events.noPaymentLinked'));
            }

            $payment = (new PaymentsModel())->find($booking->payment_id);

            if ($payment === null) {
                return $this->respondNotFound(lang('Events.paymentNotFound'));
            }

            $paymentLibrary = new PaymentLibrary();
            $status         = $paymentLibrary->getVerifiedStatus($payment);

            $this->reconcileBooking($payment, $status);

            $refreshed = $eventUsersModel->withDeleted()->find($id);

            $message = match (true) {
                $status === 'paid' && $refreshed->status === 'confirmed' => lang('Events.paymentVerifiedConfirmed'),
                in_array($status, ['failed', 'canceled'], true) => lang('Events.paymentVerifiedFailed'),
                default => lang('Events.paymentVerifiedPending'),
            };

            return $this->respond([
                'paymentStatus'      => $status,
                'registrationStatus' => $refreshed->status,
                'message'            => $message,
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * Admin-only forced refund: returns the full payment to the customer's
     * card and cancels the booking, bypassing the self-cancellation deadline
     * that {@see cancel()} enforces. Meant for the case where a paid,
     * confirmed registration can no longer be self-cancelled (the
     * registration window has closed) but the customer still needs their
     * money back — e.g. a force-majeure no-show.
     *
     * Unlike the automatic refund inside {@see cancel()} (fire-and-forget,
     * only logged on failure since nobody is watching the response), this
     * call is synchronous and admin-initiated: the caller sees the bank's
     * result immediately.
     */
    public function refundRegistrationPayment($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized();
        }

        // Stricter than verifyRegistrationPayment() (events.statistic) — this
        // action moves real money and cannot be undone, so it needs its own
        // dedicated privilege rather than reusing a broader one.
        if (!$this->session->can(Permission::EVENTS_REFUND)) {
            return $this->respondForbidden();
        }

        try {
            if (empty($id)) {
                return $this->respondInvalidRequest('refundRegistrationPayment() called without a registration id');
            }

            $eventUsersModel = new EventsUsersModel();
            $booking         = $eventUsersModel->withDeleted()->find($id);

            if ($booking === null) {
                return $this->respondNotFound(lang('Events.notRegistered'));
            }

            if ($booking->deleted_at !== null) {
                return $this->respondConflict(lang('Events.refundAlreadyCanceled'));
            }

            if (empty($booking->payment_id)) {
                return $this->respondConflict(lang('Events.noPaymentLinked'));
            }

            $paymentsModel = new PaymentsModel();
            $payment       = $paymentsModel->find($booking->payment_id);

            if ($payment === null) {
                return $this->respondNotFound(lang('Events.paymentNotFound'));
            }

            // Idempotent: money is already back, just make sure the booking
            // itself is cancelled too (e.g. a previous attempt refunded the
            // payment but the process died before the booking was deleted).
            if ($payment->status === 'refunded') {
                if ($booking->deleted_at === null) {
                    $eventUsersModel->delete($booking->id);
                }

                return $this->respond([
                    'paymentStatus'      => 'refunded',
                    'registrationStatus' => $booking->status,
                    'message'            => lang('Events.refundAlreadyDone'),
                ]);
            }

            if ($payment->status !== 'paid') {
                return $this->respondConflict(lang('Events.refundNotPaid'));
            }

            // No row lock here on purpose: unlike cancel() (which frees the
            // seat first and refunds best-effort afterwards, alerting on
            // failure since it's unattended), this admin action deliberately
            // leaves the booking untouched until the gateway call actually
            // succeeds — so a failed refund is a safe, retryable no-op, and
            // there's nothing on the events_users side to race over yet. The
            // external HTTP call below must not happen inside a DB
            // transaction/lock (see cancel()'s comment on the same rule).
            // Concurrent duplicate calls (e.g. a double click) are still
            // safe: PaymentLibrary::refund() atomically claims the payment
            // row ('paid' -> 'refunding') before calling the gateway, so at
            // most one caller actually reaches the bank.
            $refundOk = (new PaymentLibrary())->refund($payment);

            if (!$refundOk) {
                // Re-fetch: refund() persisted error_code/error_message on
                // the row but didn't mutate this in-memory entity.
                $refreshedPayment = $paymentsModel->find($payment->id);

                return $this->respondServerError(
                    lang('Events.refundFailed', [$refreshedPayment->error_message ?? ''])
                );
            }

            $eventUsersModel->delete($booking->id);

            $refreshed = $eventUsersModel->withDeleted()->find($id);
            $event     = $this->model->find($booking->event_id);

            if ($event) {
                $user = (new UsersModel())->find($booking->user_id);
                $this->queueRefundEmail($event, $user->email ?? null, $user->locale ?? null);
            }

            return $this->respond([
                'paymentStatus'      => 'refunded',
                'registrationStatus' => $refreshed->status,
                'message'            => lang('Events.refundSuccess'),
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * Parses a wall-clock string as Orenburg/Yekaterinburg local time and
     * converts it to a UTC datetime string for storage. Returns null when
     * the input cannot be parsed as a date, so callers can return a 400
     * instead of letting a malformed date fall through to a generic 500.
     */
    private function parseOrenburgDateTime(string $value): ?string
    {
        try {
            return Time::parse($value, 'Asia/Yekaterinburg')->setTimezone('UTC')->toDateTimeString();
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Parses the client-supplied EXIF capture timestamp (`takenAt`) for an
     * event photo upload. Unlike {@see parseOrenburgDateTime()}, a bad value
     * here must never fail the upload — EXIF data is frequently missing or
     * malformed — so any unparseable or future-dated input silently becomes
     * null instead of surfacing a validation error.
     */
    private function parseTakenAt(?string $value): ?string
    {
        if (empty($value)) {
            return null;
        }

        $timestamp = strtotime($value);

        if ($timestamp === false || $timestamp > time()) {
            return null;
        }

        return date('Y-m-d H:i:s', $timestamp);
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
            return $this->respondUnauthorized();
        }

        if (!$this->session->can(Permission::EVENTS_CREATE)) {
            return $this->respondForbidden();
        }

        $input = $this->request->getPost();
        $file  = $this->request->getFile('upload');

        $requiresRegistration = true;

        if (isset($input['requiresRegistration'])) {
            $requiresRegistration = filter_var($input['requiresRegistration'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

            if ($requiresRegistration === null) {
                return $this->respondValidationErrors(['requiresRegistration' => lang('Events.invalidRequiresRegistrationValue')]);
            }
        }

        $rules = [
            'title'             => 'required|string|max_length[250]',
            'content'           => 'if_exist|string',
            'tickets'           => 'required|integer|greater_than[0]|less_than[5000]',
            'ticketPrice'       => 'if_exist|decimal|greater_than_equal_to[0]',
            'date'              => 'required|string|max_length[50]',
            'endDate'           => 'if_exist|string|max_length[50]',
            'registrationStart' => $requiresRegistration ? 'required|string|max_length[50]' : 'if_exist|string|max_length[50]',
            'registrationEnd'   => $requiresRegistration ? 'required|string|max_length[50]' : 'if_exist|string|max_length[50]',
            'location'          => 'if_exist|string|max_length[150]',
            'address'           => 'if_exist|string|max_length[255]',
            'latitude'          => 'if_exist|decimal',
            'longitude'         => 'if_exist|decimal',
            'minAge'            => 'if_exist|integer|greater_than_equal_to[0]',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$file || !$file->isValid()) {
            return $this->respondValidationErrors(['upload' => lang('General.fileUploadFailed')]);
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!in_array($file->getMimeType(), $allowedMimes, true)) {
            return $this->respondValidationErrors(['upload' => lang('General.invalidFileType')]);
        }

        // Check input data validation rules
        if (!$this->validator->run($input)) {
            return $this->respondValidationErrors($this->validator->getErrors());
        }

        // Parse and validate the dates before touching the filesystem, so a
        // malformed date or an inconsistent registration window fails fast
        // (400) without leaving an orphaned upload directory behind.
        $eventDateUtc = $this->parseOrenburgDateTime($input['date']);

        if ($eventDateUtc === null) {
            return $this->respondValidationErrors(['date' => lang('Events.invalidDateFormat')]);
        }

        $eventEndDateUtc = null;

        if (isset($input['endDate'])) {
            $eventEndDateUtc = $this->parseOrenburgDateTime($input['endDate']);

            if ($eventEndDateUtc === null) {
                return $this->respondValidationErrors(['endDate' => lang('Events.invalidDateFormat')]);
            }

            if ($eventEndDateUtc <= $eventDateUtc) {
                return $this->respondValidationErrors(['endDate' => lang('Events.invalidEventEndDate')]);
            }
        }

        $registrationStartUtc = null;
        $registrationEndUtc   = null;

        if ($requiresRegistration) {
            $registrationStartUtc = $this->parseOrenburgDateTime($input['registrationStart']);
            $registrationEndUtc   = $this->parseOrenburgDateTime($input['registrationEnd']);

            if ($registrationStartUtc === null || $registrationEndUtc === null) {
                return $this->respondValidationErrors([
                    'registrationStart' => lang('Events.invalidDateFormat'),
                    'registrationEnd'   => lang('Events.invalidDateFormat'),
                ]);
            }

            if ($registrationStartUtc >= $registrationEndUtc || $registrationEndUtc > $eventDateUtc) {
                return $this->respondValidationErrors([
                    'registrationStart' => lang('Events.invalidRegistrationWindow'),
                    'registrationEnd'   => lang('Events.invalidRegistrationWindow'),
                ]);
            }
        }

        try {
            $event = new EventEntity();
            $event->id                 = uniqid();
            $event->title_ru           = $input['title'];
            $event->title_en           = $input['title'];
            $event->content_ru         = $input['content'] ?? '';
            $event->content_en         = $input['content'] ?? '';
            $event->max_tickets        = $input['tickets'];
            $event->requiresRegistration = $requiresRegistration;
            $event->ticket_price       = isset($input['ticketPrice']) ? (float) $input['ticketPrice'] : 0;
            $event->location           = $input['location'] ?? null;
            $event->address            = $input['address'] ?? null;
            $event->latitude           = isset($input['latitude']) ? (float) $input['latitude'] : self::DEFAULT_LATITUDE;
            $event->longitude          = isset($input['longitude']) ? (float) $input['longitude'] : self::DEFAULT_LONGITUDE;
            $event->minAge             = isset($input['minAge']) ? (int) $input['minAge'] : null;
            $event->date               = $eventDateUtc;
            $event->endDate            = $eventEndDateUtc;
            $event->registration_start = $registrationStartUtc;
            $event->registration_end   = $registrationEndUtc;
            $event->views              = 0;

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

            $this->model->save($event);

            return $this->respondCreated($event);
        } catch (\Exception $e) {
            log_message('error', $e->getMessage());
            return $this->respondServerError(lang('General.couldNotSaveData'));
        }
    }

    public function booking(): ResponseInterface {
        // Check that user is auth
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized();
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
            return $this->respondValidationErrors($this->validator->getErrors());
        }

        try {
            $event = $this->model->find($input['eventId']);
            // Check that event with ID is exists
            if (!$event) {
                return $this->respondNotFound(lang('Events.notExists'));
            }

            if (!$event->requiresRegistration) {
                return $this->respondConflict(lang('Events.registrationNotRequired'));
            }

            $eventUsersModel = new EventsUsersModel();

            // Check registration start and end dates. Timezone is explicit here
            // (rather than relying on the ambient app.appTimezone default)
            // because registration_start/registration_end are always stored as
            // true UTC instants (see parseOrenburgDateTime()) — see the 2026-08-19
            // incident postmortem where a misconfigured non-UTC default caused
            // EventEntity's automatic 'datetime' cast to reinterpret an already-UTC
            // value in the wrong zone, closing registration ~5 hours early.
            $currentTime   = new Time('now', 'UTC');
            $timeDiffStart = $currentTime->difference($event->registration_start);
            $timeDiffEnd   = $currentTime->difference($event->registration_end);

            if ($timeDiffStart->getSeconds() >= 0 || $timeDiffEnd->getSeconds() <= 0) {
                return $this->respondConflict(lang('Events.registrationClosed'));
            }

            // Release seats held by expired, unpaid reservations before counting.
            $paymentLibrary = new PaymentLibrary();
            $this->releaseExpiredBookings($eventUsersModel, $paymentLibrary);

            // Persist (or refresh) the user's profile name/phone.
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

            $childrenAges = $input['childrenAges'] ?? [];
            // Access via the datamap property (`ticketPrice`), not the raw column
            // name: CI4 Entity's __isset() returns false for a datamap *target*
            // column, so `$event->ticket_price ?? 0` would coalesce to 0 and send
            // every paid booking down the free branch.
            $ticketPrice  = (float) ($event->ticketPrice ?? 0);
            $bookingStatus = $ticketPrice <= 0 ? 'confirmed' : 'pending';

            // Serialize concurrent booking attempts for the same event: without
            // this lock, two requests (a double-submit, or two different users
            // going for the last seat) could both pass the "already
            // registered" / "seats available" checks below before either
            // commits its INSERT, producing a duplicate booking or overselling
            // the last seat.
            $db = Database::connect();
            $db->transStart();

            // SQLite (used by the test suite) doesn't support FOR UPDATE; the
            // lock is only meaningful against backends with real row-level
            // locking (MySQLi/MariaDB, Postgres, Oracle).
            if (in_array($db->DBDriver, ['MySQLi', 'Postgre', 'OCI8'], true)) {
                $db->query('SELECT id FROM events WHERE id = ? FOR UPDATE', [$input['eventId']]);
            }

            // A previous attempt for this (event, user) that ended in a
            // declined/expired payment is kept as status = 'failed' (not
            // soft-deleted) so it can be resurrected here instead of piling
            // up a new row per retry. 'pending'/'confirmed' means a real,
            // still-active registration — block those as already registered.
            $existingBooking = $eventUsersModel
                ->where(['event_id' => $input['eventId'], 'user_id' => $this->session->user->id])
                ->first();

            if ($existingBooking && $existingBooking->status !== 'failed') {
                $db->transComplete();

                return $this->respondConflict(lang('Events.alreadyRegistered'));
            }

            // Check available tickets (adults occupy the bookable slots; a
            // 'failed' row from a past attempt is excluded, it holds no seat).
            $currentTickets = $eventUsersModel
                ->selectSum('adults')
                ->where('event_id', $input['eventId'])
                ->whereIn('status', ['pending', 'confirmed'])
                ->first();

            $currentTickets = (int) $currentTickets->adults;

            if ($currentTickets >= (int) $event->max_tickets) {
                $db->transComplete();

                return $this->respondConflict(lang('Events.noTicketsAvailable'));
            }

            $bookingFields = [
                'event_id'      => $input['eventId'],
                'user_id'       => $this->session->user->id,
                'adults'        => $input['adults'],
                'children'      => $input['children'],
                'children_ages' => json_encode($childrenAges),
                'status'        => $bookingStatus,
                'payment_id'    => null,
            ];

            if ($existingBooking) {
                $eventUsersModel->update($existingBooking->id, $bookingFields);
                $booking = $eventUsersModel->find($existingBooking->id);
            } else {
                $eventUsersModel->insert($bookingFields);

                // The booking is unique per (event, user); fetch the row we just created.
                $booking = $eventUsersModel
                    ->where(['event_id' => $input['eventId'], 'user_id' => $this->session->user->id])
                    ->first();
            }

            $db->transComplete();

            if ($db->transStatus() === false || !$booking) {
                return $this->respondServerError();
            }

            // Free event — confirm the booking immediately, no payment required.
            if ($bookingStatus === 'confirmed') {
                $this->queueTicketEmail(
                    $booking,
                    $event,
                    $this->session->user->email ?? null,
                    $this->session->user->name ?? null
                );

                return $this->respond([
                    'result'    => true,
                    'message'   => lang('Events.bookingSuccess'),
                    'bookingId' => $booking->id,
                ]);
            }

            // Paid event — the seat is already held as pending; register an
            // acquiring order for it (outside the lock — this is an external
            // HTTP call to the gateway and must not hold a DB row lock).
            $bookingId = $booking->id;

            $amountRub     = round((int) $input['adults'] * $ticketPrice, 2);
            $amountKopecks = (int) round($amountRub * 100);
            $returnUrl     = rtrim((string) getenv('app.siteUrl'), '/') . '/stargazing/payment';

            $payment = $paymentLibrary->createPayment(
                'event_booking',
                $bookingId,
                $amountKopecks,
                $event->title_ru ?? 'Stargazing',
                $returnUrl,
                $returnUrl
            );

            if ($payment === null) {
                // Could not start the payment — release the held seat, but
                // keep the row (status = 'failed') so a retry resurrects it.
                $eventUsersModel->update($bookingId, ['status' => 'failed']);

                return $this->respondServerError(lang('Events.paymentFailed'));
            }

            $eventUsersModel->update($bookingId, ['payment_id' => $payment->id]);

            return $this->respond([
                'result'  => true,
                'payment' => [
                    'formUrl' => $payment->form_url,
                    'orderId' => $payment->order_id,
                    'amount'  => $amountRub,
                ],
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    public function cancel(): ResponseInterface {
        // Check that user is auth
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized();
        }

        $input = $this->request->getJSON(true);
        $rules = ['eventId' => 'required|string|max_length[13]'];

        $this->validator = Services::Validation()->setRules($rules);

        // Check input data validation rules
        if (!$this->validator->run($input)) {
            return $this->respondValidationErrors($this->validator->getErrors());
        }

        try {
            $event = $this->model->find($input['eventId']);
            // Check that event with ID is exists
            if (!$event) {
                return $this->respondNotFound(lang('Events.notExists'));
            }

            $eventUsersModel  = new EventsUsersModel();
            $userRegistration = $eventUsersModel->where(['event_id' => $input['eventId'], 'user_id' => $this->session->user->id])->first();

            // Check that user not already registered at this event
            if (empty($userRegistration)) {
                return $this->respondNotFound(lang('Events.notRegistered'));
            }

            // The registration window only protects confirmed seats. An unpaid
            // pending hold must always be cancellable — otherwise a stuck
            // payment can never be released once registration closes.
            if ($userRegistration->status === 'confirmed') {
                // Explicit UTC — see the identical comment in booking() above.
                $currentTime   = new Time('now', 'UTC');
                $timeDiffStart = $currentTime->difference($event->registration_start);
                $timeDiffEnd   = $currentTime->difference($event->registration_end);

                if ($timeDiffStart->getSeconds() >= 0 || $timeDiffEnd->getSeconds() <= 0) {
                    return $this->respondConflict(lang('Events.registrationClosed'));
                }
            }

            // Claim the cancellation inside a row lock before touching the
            // payment: without this, a double-click (or two open tabs) could
            // both read the same 'paid' payment and both attempt a refund
            // concurrently. The booking is soft-deleted *inside* the lock so
            // a second, racing request sees it already gone and exits early
            // as a no-op. The actual refund/email happens only once, after
            // the lock is released — same rationale as booking(): an
            // external HTTP call/queue write must not hold a DB row lock.
            $db = Database::connect();
            $db->transStart();

            // SQLite (used by the test suite) doesn't support FOR UPDATE; the
            // lock is only meaningful against backends with real row-level
            // locking (MySQLi/MariaDB, Postgres, Oracle).
            if (in_array($db->DBDriver, ['MySQLi', 'Postgre', 'OCI8'], true)) {
                $db->query('SELECT id FROM events_users WHERE id = ? FOR UPDATE', [$userRegistration->id]);
            }

            $lockedRegistration = $eventUsersModel->find($userRegistration->id);

            if (empty($lockedRegistration)) {
                $db->transComplete();

                // Already cancelled by a concurrent request — idempotent no-op.
                return $this->respond(['message' => lang('Events.cancelSuccess')]);
            }

            $eventUsersModel->delete($lockedRegistration->id);

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->respondServerError();
            }

            // Settle the linked payment now that the seat is safely released:
            // refund it if already paid, or mark it cancelled if still
            // pending. Marking it cancelled is a best-effort audit trail — if
            // the customer still completes payment on an abandoned form
            // afterwards, reconcileBooking() will auto-refund it since this
            // booking is already soft-deleted by then.
            if (!empty($lockedRegistration->payment_id)) {
                $paymentsModel = new PaymentsModel();
                $payment       = $paymentsModel->find($lockedRegistration->payment_id);

                if ($payment && $payment->status === 'paid') {
                    if (!(new PaymentLibrary())->refund($payment)) {
                        log_message('error', 'Refund failed for payment {id} on user-initiated cancellation of event {eventId}', [
                            'id'      => $payment->id,
                            'eventId' => $input['eventId'],
                        ]);
                    }
                } elseif ($payment && in_array($payment->status, ['new', 'pending'], true)) {
                    $paymentsModel->update($payment->id, ['status' => 'canceled']);
                }
            }

            $this->queueCancellationEmail(
                $event,
                $this->session->user->email ?? null,
                $this->session->user->locale ?? null
            );

            return $this->respond(['message' => lang('Events.cancelSuccess')]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
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
            return $this->respondUnauthorized();
        }

        if (!$this->session->can(Permission::EVENTS_GALLERY_UPLOAD)) {
            return $this->respondForbidden();
        }

        $photo = $this->request->getFile('photo');
        if (!$photo || !$photo->isValid()) {
            return $this->respondValidationErrors(['photo' => lang('General.fileUploadFailed')]);
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!in_array($photo->getMimeType(), $allowedMimes, true)) {
            return $this->respondValidationErrors(['photo' => lang('General.invalidFileType')]);
        }

        $eventData = $this->model->find($id);
        if (!$eventData || !$eventData->id) {
            return $this->respondNotFound(lang('Events.notFound'));
        }

        try {
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

            $photographerName = trim((string) ($this->request->getPost('photographerName') ?? ''));
            $photographerName = $photographerName !== '' ? $photographerName : null;

            $takenAt = $this->parseTakenAt($this->request->getPost('takenAt'));

            // Сохраняем в базу
            $photoEntity = new EventPhotoEntity([
                'event_id'          => $eventData->id,
                'user_id'           => $this->session->user?->id,
                'photographer_name' => $photographerName,
                'taken_at'          => $takenAt,
                'file_name'         => $name,
                'file_ext'          => $ext,
                'file_size'         => $file->getSize(),
                'image_width'       => $width,
                'image_height'      => $height,
            ]);

            (new EventsPhotosModel())->insert($photoEntity);

            return $this->respondCreated((object)[
                'name'         => $name,
                'ext'          => $ext,
                'width'        => $width,
                'height'       => $height,
                'photographer' => $photoEntity->photographer,
                'takenAt'      => $photoEntity->takenAt,
                'eventId'      => $photoEntity->event_id,
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
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
            return $this->respondUnauthorized();
        }

        if (!$this->session->can(Permission::EVENTS_UPDATE)) {
            return $this->respondForbidden();
        }

        $event = $this->model->find($id);

        if (!$event) {
            return $this->respondNotFound();
        }

        $file = $this->request->getFile('upload');

        if (!$file || !$file->isValid()) {
            return $this->respondValidationErrors(['upload' => lang('General.fileUploadFailed')]);
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!in_array($file->getMimeType(), $allowedMimes, true)) {
            return $this->respondValidationErrors(['upload' => lang('General.invalidFileType')]);
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
            return $this->respondServerError();
        }
    }

    public function delete($id = null): ResponseInterface {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized();
        }

        if (!$this->session->can(Permission::EVENTS_DELETE)) {
            return $this->respondForbidden();
        }

        try {
            $eventData = $this->model->find($id);

            if (!$eventData) {
                return $this->respondNotFound();
            }

            if (!$this->model->isUpcoming($eventData)) {
                return $this->respondConflict(lang('Events.cannotDeletePastEvent'));
            }

            $hasRegistrations = (new EventsUsersModel())
                ->whereIn('status', ['pending', 'confirmed'])
                ->where('event_id', $id)
                ->countAllResults() > 0;

            if ($hasRegistrations) {
                return $this->respondConflict(lang('Events.hasRegistrations'));
            }

            $this->model->delete($id);

            // The events -> events_photos foreign key is CASCADE, but that
            // only fires on a hard DELETE — this is a soft delete, so the
            // photos must be soft-deleted explicitly or they would keep
            // being served forever by GET /events/photos.
            (new EventsPhotosModel())->where('event_id', $id)->delete();

            return $this->respondDeleted($eventData);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
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
            return $this->respondUnauthorized();
        }

        if (!$this->session->can(Permission::EVENTS_UPDATE)) {
            return $this->respondForbidden();
        }

        $eventData = $this->model->find($id);

        if (!$eventData) {
            return $this->respondNotFound();
        }

        $input = $this->request->getJSON(true);

        $rules = [
            'title'                 => 'if_exist|string|max_length[250]',
            'content'               => 'if_exist|string',
            'tickets'               => 'if_exist|integer|greater_than[0]|less_than[5000]',
            'ticketPrice'           => 'if_exist|decimal|greater_than_equal_to[0]',
            'date'                  => 'if_exist|string|max_length[50]',
            'endDate'               => 'if_exist|string|max_length[50]',
            'requiresRegistration'  => 'if_exist',
            'registrationStart'     => 'if_exist|string|max_length[50]',
            'registrationEnd'       => 'if_exist|string|max_length[50]',
            'location'              => 'if_exist|string|max_length[150]',
            'address'               => 'if_exist|string|max_length[255]',
            'latitude'              => 'if_exist|decimal',
            'longitude'             => 'if_exist|decimal',
            'minAge'                => 'if_exist|integer|greater_than_equal_to[0]',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->respondValidationErrors($this->validator->getErrors());
        }

        // Effective "requires registration" for this update: the incoming
        // value if sent, otherwise whatever the event already has.
        $requiresRegistration = (bool) $eventData->requiresRegistration;

        if (isset($input['requiresRegistration'])) {
            $requiresRegistration = filter_var($input['requiresRegistration'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

            if ($requiresRegistration === null) {
                return $this->respondValidationErrors(['requiresRegistration' => lang('Events.invalidRequiresRegistrationValue')]);
            }
        }

        if (isset($input['requiresRegistration']) && !$requiresRegistration && (bool) $eventData->requiresRegistration) {
            $hasActiveBookings = (new EventsUsersModel())
                ->where('event_id', $id)
                ->whereIn('status', ['pending', 'confirmed'])
                ->countAllResults() > 0;

            if ($hasActiveBookings) {
                return $this->respondConflict(lang('Events.cannotDisableRegistrationWithBookings'));
            }
        }

        // Re-validate the registration window whenever any of the three date
        // fields changes, using the existing stored value for whichever ones
        // weren't sent — so a partial update can't leave the event with an
        // inconsistent window (e.g. registration closing after the event).
        // Skipped entirely when the event doesn't require registration.
        // Also runs when registration is being turned back on, so it can't
        // silently keep the null dates left behind by a prior disable.
        $eventDateUtc = $registrationStartUtc = $registrationEndUtc = null;

        $togglingRegistrationOn = isset($input['requiresRegistration'])
            && $requiresRegistration
            && !(bool) $eventData->requiresRegistration;

        if ($requiresRegistration && (isset($input['date']) || isset($input['registrationStart']) || isset($input['registrationEnd']) || $togglingRegistrationOn)) {
            $rawEvent = $eventData->toRawArray();

            $eventDateUtc = isset($input['date'])
                ? $this->parseOrenburgDateTime($input['date'])
                : $rawEvent['date'];

            $registrationStartUtc = isset($input['registrationStart'])
                ? $this->parseOrenburgDateTime($input['registrationStart'])
                : $rawEvent['registration_start'];

            $registrationEndUtc = isset($input['registrationEnd'])
                ? $this->parseOrenburgDateTime($input['registrationEnd'])
                : $rawEvent['registration_end'];

            if ($eventDateUtc === null || $registrationStartUtc === null || $registrationEndUtc === null) {
                return $this->respondValidationErrors([
                    'date'              => lang('Events.invalidDateFormat'),
                    'registrationStart' => lang('Events.invalidDateFormat'),
                    'registrationEnd'   => lang('Events.invalidDateFormat'),
                ]);
            }

            if ($registrationStartUtc >= $registrationEndUtc || $registrationEndUtc > $eventDateUtc) {
                return $this->respondValidationErrors([
                    'registrationStart' => lang('Events.invalidRegistrationWindow'),
                    'registrationEnd'   => lang('Events.invalidRegistrationWindow'),
                ]);
            }
        } elseif (isset($input['date'])) {
            $eventDateUtc = $this->parseOrenburgDateTime($input['date']);

            if ($eventDateUtc === null) {
                return $this->respondValidationErrors(['date' => lang('Events.invalidDateFormat')]);
            }
        }

        $eventEndDateUtc = null;

        if (isset($input['endDate'])) {
            $eventEndDateUtc = $this->parseOrenburgDateTime($input['endDate']);

            if ($eventEndDateUtc === null) {
                return $this->respondValidationErrors(['endDate' => lang('Events.invalidDateFormat')]);
            }

            $effectiveEventDateUtc = $eventDateUtc ?? $eventData->toRawArray()['date'];

            if ($eventEndDateUtc <= $effectiveEventDateUtc) {
                return $this->respondValidationErrors(['endDate' => lang('Events.invalidEventEndDate')]);
            }
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

            if (isset($input['ticketPrice'])) {
                $updateData['ticket_price'] = (float) $input['ticketPrice'];
            }

            if (isset($input['date'])) {
                $updateData['date'] = $eventDateUtc;
            }

            if (isset($input['endDate'])) {
                $updateData['end_date'] = $eventEndDateUtc;
            }

            if (isset($input['requiresRegistration'])) {
                $updateData['requires_registration'] = $requiresRegistration ? 1 : 0;

                if (!$requiresRegistration) {
                    $updateData['registration_start'] = null;
                    $updateData['registration_end']   = null;
                }
            }

            if ($requiresRegistration && isset($input['registrationStart'])) {
                $updateData['registration_start'] = $registrationStartUtc;
            }

            if ($requiresRegistration && isset($input['registrationEnd'])) {
                $updateData['registration_end'] = $registrationEndUtc;
            }

            if (isset($input['location'])) {
                $updateData['location'] = $input['location'];
            }

            if (isset($input['address'])) {
                $updateData['address'] = $input['address'];
            }

            if (isset($input['latitude'])) {
                $updateData['latitude'] = (float) $input['latitude'];
            }

            if (isset($input['longitude'])) {
                $updateData['longitude'] = (float) $input['longitude'];
            }

            if (isset($input['minAge'])) {
                $updateData['min_age'] = (int) $input['minAge'];
            }

            if (!empty($updateData)) {
                $this->model->update($id, $updateData);
            }

            return $this->respondUpdated($this->model->find($id));
        } catch (Exception $e) {
            log_message('error', $e->getMessage());
            return $this->respondServerError();
        }
    }

    /**
     * Returns the verified payment status for an order and reconciles the
     * related booking. Used by the client after returning from the bank's
     * payment page (the gateway appends the order id to the return URL).
     *
     * @return ResponseInterface JSON: { status: new|pending|paid|failed|canceled|refunded }.
     */
    public function paymentStatus(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized();
        }

        $input = $this->request->getJSON(true);
        $rules = ['orderId' => 'required|string|max_length[64]'];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->respondValidationErrors($this->validator->getErrors());
        }

        try {
            $paymentLibrary = new PaymentLibrary();
            $payment        = $paymentLibrary->findByOrderId($input['orderId']);

            if ($payment === null) {
                return $this->respondNotFound(lang('Events.paymentNotFound'));
            }

            // Only the booking owner may query its payment status. Fail
            // closed: if PaymentLibrary ever grows a second entity_type
            // without its own ownership check added here, this must not
            // silently let it through unchecked.
            if ($payment->entity_type !== 'event_booking') {
                return $this->respondNotFound(lang('Events.paymentNotFound'));
            }

            $booking = (new EventsUsersModel())->withDeleted()->find($payment->entity_id);

            if ($booking === null || $booking->user_id !== $this->session->user->id) {
                return $this->respondForbidden();
            }

            $status = $paymentLibrary->getVerifiedStatus($payment);
            $this->reconcileBooking($payment, $status);

            $response = ['status' => $status];

            if (in_array($status, ['failed', 'canceled'], true)) {
                // getVerifiedStatus() persists error_code/error_message to the
                // DB but doesn't mutate this in-memory entity — re-fetch to
                // read what was just saved.
                $refreshed = $paymentLibrary->findByOrderId($input['orderId']);

                if (!empty($refreshed->errorMessage)) {
                    $response['errorMessage'] = $refreshed->errorMessage;
                }
            }

            // Expose the booking id so the return page can render the ticket once paid.
            $response['bookingId'] = $payment->entity_id;

            return $this->respond($response);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * Asynchronous payment gateway callback endpoint (server-to-server).
     *
     * Authenticity is verified via the gateway signature before the booking is
     * reconciled. Returns HTTP 200 on success so the gateway stops retrying,
     * and HTTP 400 when the signature is invalid.
     *
     * @return ResponseInterface
     */
    public function paymentCallback(): ResponseInterface
    {
        $params = $this->request->getGet();

        if (empty($params)) {
            $params = $this->request->getPost();
        }

        $paymentLibrary = new PaymentLibrary();

        if (!$paymentLibrary->verifyCallbackParams($params)) {
            log_message('error', 'Payment callback rejected: invalid signature');

            return $this->respondError(lang('Events.paymentInvalidCallback'));
        }

        try {
            $payment = $paymentLibrary->handleCallback($params);

            if ($payment !== null) {
                $this->reconcileBooking($payment, $payment->status);
            }

            return $this->respond(['status' => 'ok']);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * Releases seats held by expired, unpaid reservations — but verifies each
     * one against the gateway first (via {@see PaymentLibrary::releaseExpired()})
     * instead of trusting our own local hold timer alone, so a payment the
     * bank actually captured is confirmed or refunded via {@see reconcileBooking()}
     * rather than silently written off as failed while keeping the customer's
     * money.
     *
     * PERFORMANCE NOTE: PaymentLibrary::releaseExpired() makes one synchronous
     * HTTP request to the payment gateway per expired payment (batch-limited
     * by PaymentsModel::getExpiredPending(), but still a real network call).
     * This can be slow — or stall entirely — if the gateway is slow or
     * unreachable. It is called from `upcoming()`, a public, unauthenticated,
     * high-traffic endpoint, so do not assume this returns quickly.
     *
     * @param EventsUsersModel $eventUsersModel
     * @param PaymentLibrary   $paymentLibrary
     * @return void
     */
    private function releaseExpiredBookings(EventsUsersModel $eventUsersModel, PaymentLibrary $paymentLibrary): void
    {
        $failedPaymentIds = [];

        foreach ($paymentLibrary->releaseExpired() as ['payment' => $payment, 'status' => $status]) {
            if ($status === 'paid') {
                // The bank says the customer *was* charged even though our
                // local hold already lapsed. Let the normal reconciliation
                // path confirm the booking (if a seat can still be honoured)
                // or auto-refund it (if not), instead of marking a paid
                // booking as failed.
                $this->reconcileBooking($payment, 'paid');
                continue;
            }

            $failedPaymentIds[] = $payment->id;
        }

        $eventUsersModel->releaseExpiredPendingByPaymentIds($failedPaymentIds);
    }

    /**
     * Reconciles an event booking with its payment outcome.
     *
     * Paid → the pending booking is confirmed (atomically — and only if this
     * payment is still the booking's active attempt — so a racing webhook
     * and status poll cannot both send the ticket email). Failed/canceled →
     * a still-pending booking tied to this exact payment is marked 'failed'
     * (not soft-deleted), so a retry can resurrect the same row.
     *
     * The booking's payment_id may no longer match this payment by the time
     * a late "paid" outcome arrives — e.g. the customer completed payment on
     * an abandoned form after the hold expired, after they cancelled, or
     * after they retried under a new order. There is no seat to honour for
     * an outdated payment, so it is refunded automatically instead of being
     * confirmed and emailed as a valid ticket.
     *
     * @param PaymentEntity $payment The payment to reconcile.
     * @param string        $status  Normalised payment status.
     * @return void
     */
    private function reconcileBooking(PaymentEntity $payment, string $status): void
    {
        if ($payment->entity_type !== 'event_booking') {
            return;
        }

        $eventUsersModel = new EventsUsersModel();
        $booking         = $eventUsersModel->withDeleted()->find($payment->entity_id);

        if ($booking === null) {
            return;
        }

        if ($status === 'paid') {
            // Already confirmed by this exact payment — idempotent re-poll or
            // re-callback. Without this check, every subsequent poll after a
            // legitimate success would fall through to the refund branch below.
            if ($booking->status === 'confirmed' && $booking->payment_id === $payment->id) {
                return;
            }

            if ($eventUsersModel->confirmIfPending($payment->entity_id, (string) $payment->id)) {
                // Email the ticket once, on the transition to confirmed.
                $event = $this->model->find($booking->event_id);
                $owner = (new UsersModel())->find($booking->user_id);

                if ($event && $owner) {
                    $this->queueTicketEmail(
                        $booking,
                        $event,
                        $owner->email ?? null,
                        $owner->name ?? null
                    );
                }

                return;
            }

            // Could not honour it as a live pending attempt: the booking was
            // cancelled, its hold already expired, or it was retried under a
            // newer payment. Refund automatically instead of confirming (or
            // silently ignoring) a payment that no longer has a seat behind it.
            $freshPayment = (new PaymentsModel())->find($payment->id) ?? $payment;

            if (!(new PaymentLibrary())->refund($freshPayment)) {
                log_message('error', 'Auto-refund failed for payment {id} — booking {bookingId} is no longer awaiting it', [
                    'id'        => $payment->id,
                    'bookingId' => $payment->entity_id,
                ]);
            }

            return;
        }

        if (in_array($status, ['failed', 'canceled'], true)
            && $booking->status === 'pending'
            && $booking->payment_id === $payment->id
        ) {
            $eventUsersModel->update($payment->entity_id, ['status' => 'failed']);
        }
    }
}
