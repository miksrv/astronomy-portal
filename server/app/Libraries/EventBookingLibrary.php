<?php

namespace App\Libraries;

use App\Entities\EventEntity;
use App\Entities\PaymentEntity;
use App\Models\EmailQueueModel;
use App\Models\EventsModel;
use App\Models\EventsUsersModel;
use App\Models\PaymentsModel;
use App\Models\UsersModel;
use CodeIgniter\I18n\Time;

/**
 * An event booking against its payment: the seats of expired unpaid holds, the outcome of a
 * payment (confirm + ticket email, refund, or failed) and the ticket itself. Shared by the
 * Events controller (booking, payment callback and status poll) and `system:cron`, so a
 * payment the bank captured after its hold expired is confirmed or refunded whichever of the
 * two finds it first.
 */
class EventBookingLibrary
{
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
     * unreachable. It is called from `Events::upcoming()`, a public, unauthenticated,
     * high-traffic endpoint, so do not assume this returns quickly.
     *
     * @param EventsUsersModel $eventUsersModel
     * @param PaymentLibrary   $paymentLibrary
     * @return void
     */
    public function releaseExpiredBookings(
        EventsUsersModel $eventUsersModel = new EventsUsersModel(),
        PaymentLibrary $paymentLibrary = new PaymentLibrary(),
    ): void {
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
    public function reconcileBooking(PaymentEntity $payment, string $status): void
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
                $event = (new EventsModel())->find($booking->event_id);
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
    public function buildTicketData(object $booking, EventEntity $event, ?string $userName, string $locale): array
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
     * Renders the PNG ticket and queues a confirmation email (with the ticket
     * embedded) to the booking owner for asynchronous delivery by the
     * `system:cron` cron. The PNG is written to a durable file the cron
     * deletes once sent. Enqueue failures are logged but never bubble up —
     * a failed email must not break the booking/payment flow.
     *
     * The email itself is Russian-only (no i18n) — see `Views/email_ticket.php`.
     */
    public function queueTicketEmail(object $booking, EventEntity $event, ?string $toEmail, ?string $userName): void
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
}
