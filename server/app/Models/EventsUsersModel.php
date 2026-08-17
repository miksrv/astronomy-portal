<?php

namespace App\Models;

use App\Entities\EventUserEntity;

/**
 * EventsUsersModel
 *
 * Manages the `events_users` pivot table that records user bookings and
 * check-ins for stargazing events. Supports soft deletes (explicit user
 * cancellation) and UUID primary keys generated via the beforeInsert
 * callback. A declined/expired payment does NOT soft-delete the row — it
 * sets status = 'failed' instead, so the same (event, user) row can be
 * resurrected by a retry rather than accumulating one row per attempt.
 * Read queries must explicitly exclude 'failed' where it matters (member
 * lists, statistics, mailing audiences, participant counts).
 */
class EventsUsersModel extends ApplicationBaseModel
{
    protected $table            = 'events_users';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = EventUserEntity::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'event_id',
        'user_id',
        'adults',
        'children',
        'children_ages',
        'status',
        'payment_id',
        'checkin_by_user_id',
        'checkin_at',
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat         = 'datetime';
    protected $createdField       = 'created_at';
    protected $updatedField       = 'updated_at';
    protected $deletedField       = 'deleted_at';

    // Validation
    protected $validationRules      = [];
    protected $validationMessages   = [];
    protected $skipValidation       = true;
    protected $cleanValidationRules = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];
    protected $afterInsert    = [];
    protected $beforeUpdate   = [];
    protected $afterUpdate    = [];
    protected $beforeFind     = [];
    protected $afterFind      = [];
    protected $beforeDelete   = [];
    protected $afterDelete    = [];

    /**
     * Retrieves all user bookings for a given event, joined with user profile data.
     *
     * @param string $eventId The event ID to fetch bookings for.
     * @return array Array of EventUserEntity objects with joined user name, avatar, and auth_type.
     */
    public function getUsersByEventId(string $eventId): ?array
    {
        $eventUsersQuery = $this->select('
                events_users.adults, events_users.children, events_users.children_ages,
                events_users.created_at, users.name, users.avatar, users.auth_type')
            ->join('users', 'users.id = events_users.user_id', 'left')
            ->where('event_id', $eventId)
            ->whereIn('events_users.status', ['pending', 'confirmed'])
            ->orderBy('created_at', 'ASC')
            ->findAll();

        return $eventUsersQuery ?: [];
    }

    /**
     * Retrieves the total adult and child counts for a specific event.
     *
     * @param string $eventId The event ID to aggregate counts for.
     * @return object|null Object with total_adults and total_children properties, or null if not found.
     */
    public function getUsersCountByEventId(string $eventId): ?object
    {
        $eventUsersQuery = $this->select('
                SUM(events_users.adults) as total_adults,
                SUM(events_users.children) as total_children')
            ->where('event_id', $eventId)
            ->whereIn('status', ['pending', 'confirmed'])
            ->findAll();

        return $eventUsersQuery[0] ?: null;
    }

    /**
     * Returns aggregated statistics for a given event.
     *
     * Executes three queries:
     *  1. Overall aggregates (totals, check-in count, average age, gender split).
     *  2. Age-group distribution for participants whose birthdays are known.
     *  3. Daily registration counts, from which a cumulative timeline is computed in PHP.
     *
     * @param string $eventId The event ID to aggregate statistics for.
     * @return array Associative array with keys: totalRegistrations, totalAdults,
     *               totalChildren, totalParticipants, checkinCount, averageAge,
     *               genderStats, ageGroups, registrationTimeline.
     */
    public function getStatisticByEventId(string $eventId): array
    {
        // --- Query 1: overall aggregates ---
        $aggregates = $this->db->table('events_users eu')
            ->select('
                COUNT(eu.id)                                                   AS total_registrations,
                SUM(eu.adults)                                                 AS total_adults,
                SUM(eu.children)                                               AS total_children,
                SUM(eu.adults + eu.children)                                   AS total_participants,
                COUNT(eu.checkin_at)                                           AS checkin_count,
                AVG(TIMESTAMPDIFF(YEAR, u.birthday, CURDATE()))                AS average_age,
                SUM(CASE WHEN u.sex = \'m\' THEN 1 ELSE 0 END)               AS gender_male,
                SUM(CASE WHEN u.sex = \'f\' THEN 1 ELSE 0 END)               AS gender_female,
                SUM(CASE WHEN u.sex IS NULL THEN 1 ELSE 0 END)                AS gender_unknown')
            ->join('users u', 'u.id = eu.user_id', 'left')
            ->where('eu.event_id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->whereIn('eu.status', ['pending', 'confirmed'])
            ->get()
            ->getRow();

        // --- Query 2: age groups ---
        $ageGroupRows = $this->db->table('events_users eu')
            ->select("
                CASE
                    WHEN TIMESTAMPDIFF(YEAR, u.birthday, CURDATE()) < 18  THEN 'under18'
                    WHEN TIMESTAMPDIFF(YEAR, u.birthday, CURDATE()) <= 25 THEN '18to25'
                    WHEN TIMESTAMPDIFF(YEAR, u.birthday, CURDATE()) <= 35 THEN '26to35'
                    WHEN TIMESTAMPDIFF(YEAR, u.birthday, CURDATE()) <= 50 THEN '36to50'
                    ELSE 'over50'
                END AS age_group,
                COUNT(*) AS count")
            ->join('users u', 'u.id = eu.user_id', 'left')
            ->where('eu.event_id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->whereIn('eu.status', ['pending', 'confirmed'])
            ->where('u.birthday IS NOT NULL')
            ->groupBy('age_group')
            ->get()
            ->getResultArray();

        // Normalise age groups: ensure all buckets are present with zero counts
        $ageGroupOrder  = ['under18', '18to25', '26to35', '36to50', 'over50'];
        $ageGroupLookup = [];
        foreach ($ageGroupRows as $row) {
            $ageGroupLookup[$row['age_group']] = (int) $row['count'];
        }
        $ageGroups = [];
        foreach ($ageGroupOrder as $bucket) {
            $ageGroups[] = [
                'group' => $bucket,
                'count' => $ageGroupLookup[$bucket] ?? 0,
            ];
        }

        // --- Query 3: individual registration timeline ---
        $timelineRows = $this->db->table('events_users eu')
            ->select('eu.created_at AS reg_datetime')
            ->where('eu.event_id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->whereIn('eu.status', ['pending', 'confirmed'])
            ->orderBy('reg_datetime', 'ASC')
            ->get()
            ->getResultArray();

        // Each row gets cumulative count = its 1-based position
        $timeline = [];
        foreach ($timelineRows as $i => $row) {
            $timeline[] = [
                'datetime'   => $row['reg_datetime'],
                'cumulative' => $i + 1,
            ];
        }

        return [
            'totalRegistrations'   => (int) ($aggregates->total_registrations ?? 0),
            'totalAdults'          => (int) ($aggregates->total_adults ?? 0),
            'totalChildren'        => (int) ($aggregates->total_children ?? 0),
            'totalParticipants'    => (int) ($aggregates->total_participants ?? 0),
            'checkinCount'         => (int) ($aggregates->checkin_count ?? 0),
            'averageAge'           => $aggregates->average_age !== null
                ? round((float) $aggregates->average_age, 1)
                : null,
            'genderStats'          => [
                'male'    => (int) ($aggregates->gender_male ?? 0),
                'female'  => (int) ($aggregates->gender_female ?? 0),
                'unknown' => (int) ($aggregates->gender_unknown ?? 0),
            ],
            'ageGroups'            => $ageGroups,
            'registrationTimeline' => $timeline,
        ];
    }

    /**
     * Returns every registration for an event — every status (pending,
     * confirmed, failed) and including soft-deleted (cancelled) rows —
     * joined with the registrant's name/email and, if any, their payment's
     * order id/status/error. Used by the admin registrations table, which
     * is the one place in the codebase that intentionally shows everything
     * rather than filtering to 'pending'/'confirmed' like the other reads
     * on this table.
     *
     * @param string $eventId The event ID to fetch registrations for.
     * @return array Rows with id, user_id, adults, children, children_ages, status,
     *               created_at, checkin_at, deleted_at, payment_id, name, email,
     *               payment_order_id, payment_status, payment_error_message.
     */
    public function getRegistrationsByEventId(string $eventId): array
    {
        return $this->db->table('events_users eu')
            ->select('
                eu.id, eu.user_id, eu.adults, eu.children, eu.children_ages, eu.status, eu.created_at,
                eu.checkin_at, eu.deleted_at, eu.payment_id,
                u.name, u.email,
                p.order_id AS payment_order_id, p.status AS payment_status,
                p.error_message AS payment_error_message')
            ->join('users u', 'u.id = eu.user_id', 'left')
            ->join('payments p', 'p.id = eu.payment_id', 'left')
            ->where('eu.event_id', $eventId)
            ->orderBy('eu.created_at', 'DESC')
            ->get()
            ->getResultArray();
    }

    /**
     * Returns this user's own booking (id + status) for every event in $eventIds — the list-view
     * equivalent of the single-event lookup Events::show()/upcoming() already do, batched so
     * Events::list() can attach `registered`/`bookedId`/`bookingStatus` to a whole page of events
     * in one query. 'failed' bookings are excluded, same rule as everywhere else on this table —
     * a declined/expired payment attempt is not a registration.
     *
     * @param string        $userId   The user's ID.
     * @param array<string> $eventIds Candidate event ids to check.
     * @return array Rows (EventUserEntity) with event_id, id (booking id), and status.
     */
    public function getBookingsForUserByEventIds(string $userId, array $eventIds): array
    {
        if (empty($eventIds)) {
            return [];
        }

        return $this->select('event_id, id, status')
            ->where('user_id', $userId)
            ->whereIn('event_id', $eventIds)
            ->whereIn('status', ['pending', 'confirmed'])
            ->findAll();
    }

    /**
     * Retrieves total adult and child counts grouped by event ID across all events.
     *
     * @return array Array of objects with event_id, total_adults, and total_children.
     */
    public function getUsersCountGroupedByEventId(): array
    {
        return $this->select('
                event_id,
                SUM(events_users.adults) as total_adults,
                SUM(events_users.children) as total_children')
            ->whereIn('status', ['pending', 'confirmed'])
            ->groupBy('event_id')
            ->findAll();
    }

    /**
     * Returns the total number of registered participants (adults + children)
     * across all events, excluding cancelled (soft-deleted) and failed
     * (declined/expired payment) bookings. Used for aggregate public statistics.
     *
     * @return int Total participants.
     */
    public function getTotalParticipants(): int
    {
        $row = $this->builder()
            ->select('SUM(adults + children) as total')
            ->where('deleted_at', null)
            ->whereIn('status', ['pending', 'confirmed'])
            ->get()
            ->getRow();

        return (int) ($row->total ?? 0);
    }

    /**
     * Returns users with valid emails registered for an event, for use as mailing recipients.
     *
     * Mirrors UsersModel::getNewsletterSubscribers(): users who explicitly
     * unsubscribed (settings->subscribe_newsletter === false) are excluded, so a
     * per-event campaign honours the same opt-out as the "all users" audience.
     *
     * @param string $eventId
     * @return array Rows with id, email, locale.
     */
    public function getMailingRecipientsByEventId(string $eventId): array
    {
        return $this->db->table('events_users eu')
            ->select('DISTINCT u.id, u.email, COALESCE(u.locale, \'ru\') as locale', false)
            ->join('users u', 'eu.user_id = u.id')
            ->where('eu.event_id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->whereIn('eu.status', ['pending', 'confirmed'])
            ->where('u.email IS NOT NULL')
            ->where("u.email != ''")
            ->where('u.deleted_at IS NULL')
            ->groupStart()
                ->where('u.settings IS NULL')
                ->orWhere("JSON_EXTRACT(u.settings, '$.subscribe_newsletter') IS NULL")
                ->orWhere("JSON_EXTRACT(u.settings, '$.subscribe_newsletter') != 0")
            ->groupEnd()
            ->get()
            ->getResultArray();
    }

    /**
     * Returns event title and count of registered users with valid emails for a specific event.
     *
     * @param string $eventId
     * @return array|null Row with title_ru, title_en, user_count or null if not found.
     */
    public function getMailingAudienceByEventId(string $eventId): ?array
    {
        return $this->db->table('events e')
            ->select('e.title_ru, e.title_en, COUNT(DISTINCT eu.user_id) as user_count')
            ->join('events_users eu', 'eu.event_id = e.id')
            ->join('users u', 'eu.user_id = u.id')
            ->where('e.id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->whereIn('eu.status', ['pending', 'confirmed'])
            ->where('u.email IS NOT NULL')
            ->where("u.email != ''")
            ->where('u.deleted_at IS NULL')
            ->groupStart()
                ->where('u.settings IS NULL')
                ->orWhere("JSON_EXTRACT(u.settings, '$.subscribe_newsletter') IS NULL")
                ->orWhere("JSON_EXTRACT(u.settings, '$.subscribe_newsletter') != 0")
            ->groupEnd()
            ->get()
            ->getRowArray() ?: null;
    }

    /**
     * Returns all events with at least one registered user with a valid email,
     * ordered newest first; used for mailing audience selection.
     *
     * @return array Rows with event_id, title_ru, title_en, user_count.
     */
    public function getMailingAudienceEvents(): array
    {
        return $this->db->table('events e')
            ->select('e.id as event_id, e.title_ru, e.title_en, COUNT(DISTINCT eu.user_id) as user_count')
            ->join('events_users eu', 'eu.event_id = e.id')
            ->join('users u', 'eu.user_id = u.id')
            ->where('eu.deleted_at IS NULL')
            ->whereIn('eu.status', ['pending', 'confirmed'])
            ->where('u.email IS NOT NULL')
            ->where("u.email != ''")
            ->where('u.deleted_at IS NULL')
            ->groupStart()
                ->where('u.settings IS NULL')
                ->orWhere("JSON_EXTRACT(u.settings, '$.subscribe_newsletter') IS NULL")
                ->orWhere("JSON_EXTRACT(u.settings, '$.subscribe_newsletter') != 0")
            ->groupEnd()
            ->groupBy('e.id')
            ->having('user_count >', 0)
            ->orderBy('e.created_at', 'DESC')
            ->get()
            ->getResultArray();
    }

    /**
     * Returns users registered for an event who also have at least one
     * active Web Push subscription, for use as push notification recipients.
     *
     * Mirrors getMailingRecipientsByEventId(), but the eligibility gate is
     * "has a push_subscriptions row" rather than the newsletter opt-out
     * setting — push opt-in is independent of subscribe_newsletter (see
     * root CLAUDE.md's FEAT-13 note).
     *
     * @return array Rows with id (user id).
     */
    public function getPushRecipientsByEventId(string $eventId): array
    {
        return $this->db->table('events_users eu')
            ->select('DISTINCT u.id', false)
            ->join('users u', 'eu.user_id = u.id')
            ->join('push_subscriptions ps', 'ps.user_id = u.id')
            ->where('eu.event_id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->whereIn('eu.status', ['pending', 'confirmed'])
            ->where('u.deleted_at IS NULL')
            ->get()
            ->getResultArray();
    }

    /**
     * Returns event title and count of registered users with at least one
     * active push subscription for a specific event.
     *
     * @return array|null Row with title_ru, title_en, user_count or null if not found.
     */
    public function getPushAudienceByEventId(string $eventId): ?array
    {
        return $this->db->table('events e')
            ->select('e.title_ru, e.title_en, COUNT(DISTINCT eu.user_id) as user_count')
            ->join('events_users eu', 'eu.event_id = e.id')
            ->join('users u', 'eu.user_id = u.id')
            ->join('push_subscriptions ps', 'ps.user_id = u.id')
            ->where('e.id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->whereIn('eu.status', ['pending', 'confirmed'])
            ->where('u.deleted_at IS NULL')
            ->get()
            ->getRowArray() ?: null;
    }

    /**
     * Returns all events with at least one registered user who has an
     * active push subscription, ordered newest first; used for push
     * notification audience selection.
     *
     * @return array Rows with event_id, title_ru, title_en, user_count.
     */
    public function getPushAudienceEvents(): array
    {
        return $this->db->table('events e')
            ->select('e.id as event_id, e.title_ru, e.title_en, COUNT(DISTINCT eu.user_id) as user_count')
            ->join('events_users eu', 'eu.event_id = e.id')
            ->join('users u', 'eu.user_id = u.id')
            ->join('push_subscriptions ps', 'ps.user_id = u.id')
            ->where('eu.deleted_at IS NULL')
            ->whereIn('eu.status', ['pending', 'confirmed'])
            ->where('u.deleted_at IS NULL')
            ->groupBy('e.id')
            ->having('user_count >', 0)
            ->orderBy('e.created_at', 'DESC')
            ->get()
            ->getResultArray();
    }

    /**
     * Marks pending bookings whose payment hold has expired as 'failed',
     * freeing their seats (excluded from capacity/audience/statistics
     * queries). The row is kept — not soft-deleted — so a later booking
     * attempt for the same (event, user) resurrects it instead of piling up
     * a new row per attempt. Called during booking/availability checks so
     * abandoned, unpaid reservations do not block other users indefinitely.
     *
     * @param array<string> $paymentIds Ids of expired, unpaid payments.
     * @return void
     */
    public function releaseExpiredPendingByPaymentIds(array $paymentIds): void
    {
        if (empty($paymentIds)) {
            return;
        }

        $this->whereIn('payment_id', $paymentIds)
            ->where('status', 'pending')
            ->set('status', 'failed')
            ->update();
    }

    /**
     * Atomically transitions a booking from 'pending' to 'confirmed', but
     * only if `$paymentId` is still its current payment_id.
     *
     * The gateway callback and the client's payment-status poll can both race
     * to reconcile the same payment; guarding the UPDATE with `WHERE status =
     * 'pending'` means only the call that actually performs the transition
     * gets `true` back, so the caller can safely gate a one-time side effect
     * (e.g. sending the ticket email) on the return value.
     *
     * The payment_id match additionally guards against a *stale* payment: if
     * the booking was retried since (a new payment_id set on the same row —
     * see {@see Events::booking()}), a late "paid" signal from the earlier,
     * superseded payment must not confirm a booking attempt it was never
     * actually part of.
     *
     * @param string $id        Booking (events_users) id.
     * @param string $paymentId The payment id being reconciled.
     * @return bool True when this call performed the transition.
     */
    public function confirmIfPending(string $id, string $paymentId): bool
    {
        $this->builder()
            ->where('id', $id)
            ->where('status', 'pending')
            ->where('payment_id', $paymentId)
            ->where('deleted_at', null)
            ->update(['status' => 'confirmed']);

        return $this->db->affectedRows() > 0;
    }

    /**
     * Returns the booking (and event id) for the next upcoming event that the
     * given user is registered for. The full event itself is fetched
     * separately via EventsModel so it comes back locale-resolved and
     * shaped like every other event response.
     *
     * @param string $userId The user's ID.
     * @return object|null A result row with the booking details, or null if none found.
     */
    public function getUpcomingRegisteredBooking(string $userId): ?object
    {
        return $this->db->table('events_users eu')
            ->select(
                'e.id AS event_id, eu.id AS booking_id, eu.status, eu.payment_id, ' .
                'eu.adults, eu.children, eu.checkin_at'
            )
            ->join('events e', 'e.id = eu.event_id')
            ->where('eu.user_id', $userId)
            // Confirmed AND pending bookings both surface here — a pending
            // (unpaid) booking still needs to show up as the user's upcoming
            // event so the profile can render its awaiting-payment / payment-
            // expired panel, instead of silently claiming there is nothing
            // upcoming while a booking's payment is still being reconciled
            // (e.g. the user paid but closed the bank tab before it redirected
            // back). A 'failed' booking is deliberately excluded — that one
            // still surfaces as "no upcoming event" here, same as before.
            ->whereIn('eu.status', ['confirmed', 'pending'])
            ->where('eu.deleted_at IS NULL')
            ->where('e.deleted_at IS NULL')
            // Same "local calendar day" boundary as EventsModel::getUpcomingEvent()
            // — an event stays current through its entire Orenburg-local day, not
            // just until its exact start time.
            ->where('e.date >=', $this->startOfTodayOrenburg()->format('Y-m-d H:i:s'))
            ->orderBy('e.date', 'ASC')
            ->limit(1)
            ->get()
            ->getRow();
    }
}
