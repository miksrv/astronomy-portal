<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Entities\EventEntity;
use CodeIgniter\I18n\Time;

class EventsModel extends ApplicationBaseModel
{
    protected $table      = 'events';
    protected $primaryKey = 'id';
    protected $returnType = EventEntity::class;

    protected $useSoftDeletes   = true;
    protected $protectFields    = true;
    protected $useAutoIncrement = false;

    protected $allowedFields    = [
        'title_en',
        'title_ru',
        'content_en',
        'content_ru',
        'cover_file_name',
        'cover_file_ext',
        'max_tickets',
        'yandex_map_link',
        'google_map_link',
        'date',
        'registration_start',
        'registration_end'
    ];

    protected bool $allowEmptyInserts = false;

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    protected $validationRules      = [];
    protected $validationMessages   = [];
    protected $skipValidation       = true;
    protected $cleanValidationRules = true;

    protected $allowCallbacks = false;
    protected $beforeInsert   = [];
    protected $afterInsert    = [];
    protected $beforeUpdate   = [];
    protected $afterUpdate    = [];
    protected $beforeFind     = [];
    protected $afterFind      = [];
    protected $beforeDelete   = [];
    protected $afterDelete    = [];

    /**
     * Retrieves the next upcoming event from the database.
     *
     * This method returns the closest future event based on the current date and time.
     * It queries the database for events with a date greater than or equal to the current
     * timestamp and orders the results in descending order by date to fetch the soonest event.
     *
     * @return EventEntity|null The upcoming event entity if found; otherwise, null.
     */
    public function getUpcomingEvent(): ?EventEntity
    {
        $datetime = new Time('now');
        return $this
            ->where('date >=', $datetime->format('Y-m-d H:m:s'))
            ->orderBy('date', 'DESC')
            ->first();
    }

    /**
     * Retrieves a list of past events or a specific event with localized titles and contents.
     *
     * This method fetches either all past events up to the current date or, if an event ID is provided,
     * details for that specific event, including additional fields. Events are returned in descending
     * order by date, with localized titles and contents based on the provided locale.
     *
     * @param string $locale The locale for localization of event titles and contents (default is 'ru').
     * @param int|null $eventId Optional. If provided, retrieves details for the specific event by ID.
     *
     * @return array|null Returns an array of events with localized fields, or an empty array if no events are found.
     */
    public function getPastEventsList(string $locale = 'ru', $eventId = null): ?array
    {
        helper('locale');

        $datetime = new Time('now');

        $eventsQuery = $this->select('id, title_en, title_ru, date, cover_file_name, cover_file_ext' . (
            $eventId !== null ? ', content_en, content_ru, max_tickets, date, registration_start, registration_end' : '')
        );

        // Apply filter if a specific event is requested
        if ($eventId !== null) {
            $eventsQuery->where('id', $eventId);
        } else {
            $eventsQuery->where('date <', $datetime->format('Y-m-d H:m:s'));
        }

        $events = $eventsQuery->orderBy('date', 'DESC')->findAll();

        if (empty($events)) {
            return [];
        }

        // Map each event with localized titles
        foreach ($events as $event) {
            $event->title = getLocalizedString($locale, $event->title_en, $event->title_ru);

            if ($eventId !== null) {
                $event->content = getLocalizedString($locale, $event->content_en, $event->content_ru);
            }

            // Remove unnecessary fields
            unset(
                $event->title_en, $event->title_ru,
                $event->content_en, $event->content_ru,
            );
        }

        return $events;
    }
}
