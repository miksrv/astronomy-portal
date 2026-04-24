<?php

namespace App\Models;

use App\Entities\EventEntity;
use CodeIgniter\I18n\Time;

/**
 * EventsModel
 *
 * Manages the `events` table for stargazing events. Supports soft deletes, UUID
 * primary keys, and bilingual content fields (title, location, content in EN/RU).
 */
class EventsModel extends ApplicationBaseModel
{
    protected $table            = 'events';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = EventEntity::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'id',
        'title_en',
        'title_ru',
        'location_en',
        'location_ru',
        'content_en',
        'content_ru',
        'cover_file_name',
        'cover_file_ext',
        'max_tickets',
        'yandex_map_link',
        'google_map_link',
        'views',
        'date',
        'registration_start',
        'registration_end',
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
    protected $beforeInsert   = [];
    protected $afterInsert    = [];
    protected $beforeUpdate   = [];
    protected $afterUpdate    = [];
    protected $beforeFind     = [];
    protected $afterFind      = [];
    protected $beforeDelete   = [];
    protected $afterDelete    = [];

    /**
     * Retrieves the next upcoming event, localised to the given locale.
     *
     * Returns the event whose date is >= (now - 5 hours), ordered so the
     * soonest event comes first. Returns null when no upcoming event exists.
     *
     * @param string $locale Locale code for title/location/content selection ('ru' or 'en'). Default is 'ru'.
     * @return EventEntity|null The upcoming EventEntity, or null if none found.
     */
    public function getUpcomingEvent(string $locale = 'ru'): ?EventEntity
    {
        helper('locale');

        $datetime = (new Time('now'))->subHours(5);

        $event = $this
            ->where('date >=', $datetime->format('Y-m-d H:i:s'))
            ->orderBy('date', 'DESC')
            ->first();

        if ($event === null) {
            return null;
        }

        $event->title    = getLocalizedString($locale, $event->title_en, $event->title_ru);
        $event->location = getLocalizedString($locale, $event->location_en, $event->location_ru);
        $event->content  = getLocalizedString($locale, $event->content_en, $event->content_ru);

        unset(
            $event->title_en, $event->title_ru,
            $event->location_en, $event->location_ru,
            $event->content_en, $event->content_ru
        );

        return $event;
    }

    /**
     * Retrieves a list of past events or a single event by ID, localised to the given locale.
     *
     * When $eventId is provided, returns details for that specific event (including content
     * and registration window fields). Otherwise returns all events whose date is in the past,
     * ordered newest first.
     *
     * @param string   $locale  Locale code for title/content selection ('ru' or 'en'). Default is 'ru'.
     * @param int|null $eventId Optional event ID. When set, retrieves that specific event only.
     * @return array Array of EventEntity objects with localised fields, or an empty array.
     */
    public function getPastEventsList(string $locale = 'ru', $eventId = null): ?array
    {
        helper('locale');

        $datetime = (new Time('now'))->addHours(5);

        $eventsQuery = $this->select('id, title_en, title_ru, date, cover_file_name, cover_file_ext, max_tickets, views' . (
            $eventId !== null ? ', content_en, content_ru, date, registration_start, registration_end' : '')
        );

        if ($eventId !== null) {
            $eventsQuery->where('id', $eventId);
        } else {
            $eventsQuery->where('date <', $datetime->format('Y-m-d H:i:s'));
        }

        $events = $eventsQuery->orderBy('date', 'DESC')->findAll();

        if (empty($events)) {
            return [];
        }

        foreach ($events as $event) {
            $event->title = getLocalizedString($locale, $event->title_en, $event->title_ru);

            if ($eventId !== null) {
                $event->content = getLocalizedString($locale, $event->content_en, $event->content_ru);
            }

            unset(
                $event->title_en, $event->title_ru,
                $event->content_en, $event->content_ru
            );
        }

        return $events;
    }

    /**
     * Increments the view counter for a specific event by 1.
     *
     * @param string $eventId The ID of the event whose view count should be incremented.
     * @return bool True if the update succeeded, false otherwise.
     */
    public function incrementViews(string $eventId): bool
    {
        return $this->builder()
            ->set('views', 'views + 1', false)
            ->where('id', $eventId)
            ->update([], null, false);
    }
}
