<?php

namespace App\Models;

use App\Entities\EventEntity;

/**
 * EventsModel
 *
 * Manages the `events` table for stargazing events. Supports soft deletes, UUID
 * primary keys, and bilingual content fields (title, content in EN/RU). Location
 * (venue name, address, coordinates) is single-language.
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
        'location',
        'address',
        'latitude',
        'longitude',
        'min_age',
        'content_en',
        'content_ru',
        'cover_file_name',
        'cover_file_ext',
        'max_tickets',
        'requires_registration',
        'ticket_price',
        'views',
        'date',
        'end_date',
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
     * Returns the event whose local (Orenburg) calendar date is today or
     * later, ordered so the soonest event comes first. An event stays
     * "upcoming" for its entire local day regardless of its time of day.
     * Returns null when no upcoming event exists.
     *
     * @param string $locale Locale code for title/location/content selection ('ru' or 'en'). Default is 'ru'.
     * @return EventEntity|null The upcoming EventEntity, or null if none found.
     */
    public function getUpcomingEvent(string $locale = 'ru'): ?EventEntity
    {
        helper('locale');

        $event = $this
            ->where('date >=', $this->startOfTodayOrenburg()->format('Y-m-d H:i:s'))
            ->orderBy('date', 'ASC')
            ->first();

        if ($event === null) {
            return null;
        }

        $event->title   = getLocalizedString($locale, $event->title_en, $event->title_ru);
        $event->content = getLocalizedString($locale, $event->content_en, $event->content_ru);

        unset(
            $event->title_en, $event->title_ru,
            $event->content_en, $event->content_ru
        );

        return $event;
    }

    /**
     * Whether the given event's local (Orenburg) calendar date is today or later.
     *
     * Used to decide whether the exact location (venue name, address,
     * coordinates) still needs to be gated behind a confirmed registration —
     * once an event has passed there is nothing left to protect.
     */
    public function isUpcoming(EventEntity $event): bool
    {
        if ($event->date === null) {
            return false;
        }

        return $event->date->getTimestamp() >= $this->startOfTodayOrenburg()->getTimestamp();
    }

    /**
     * Retrieves a list of past events or a single event by ID, localised to the given locale.
     *
     * When $eventId is provided, returns details for that specific event (including the full
     * content and registration window fields). Otherwise returns all events whose local
     * (Orenburg) calendar date is before today — i.e. events archive at the start of the day
     * *after* their date, not at their exact time — ordered newest first; each gets a short
     * plain-text `excerpt` (see `excerptFromMarkdown()`) instead of the full `content`, so the
     * archive list can preview the announcement without shipping every event's full markdown.
     *
     * @param string   $locale  Locale code for title/content selection ('ru' or 'en'). Default is 'ru'.
     * @param int|null $eventId Optional event ID. When set, retrieves that specific event only.
     * @return array Array of EventEntity objects with localised fields, or an empty array.
     */
    public function getPastEventsList(string $locale = 'ru', $eventId = null): ?array
    {
        helper('locale');

        $eventsQuery = $this->select('id, title_en, title_ru, date, cover_file_name, cover_file_ext, max_tickets, views, location, content_en, content_ru' . (
            $eventId !== null
                ? ', end_date, requires_registration, registration_start, registration_end, ticket_price, address, latitude, longitude, min_age'
                : '')
        );

        if ($eventId !== null) {
            $eventsQuery->where('id', $eventId);
        } else {
            $eventsQuery->where('date <', $this->startOfTodayOrenburg()->format('Y-m-d H:i:s'));
        }

        $events = $eventsQuery->orderBy('date', 'DESC')->findAll();

        if (empty($events)) {
            return [];
        }

        foreach ($events as $event) {
            $event->title = getLocalizedString($locale, $event->title_en, $event->title_ru);

            $content = getLocalizedString($locale, $event->content_en, $event->content_ru);

            if ($eventId !== null) {
                $event->content = $content;
            } else {
                $event->excerpt = $this->excerptFromMarkdown($content);
            }

            unset($event->title_en, $event->title_ru, $event->content_en, $event->content_ru);
        }

        return $events;
    }

    /**
     * Reduces a markdown event description down to a short, plain-text preview for list/archive
     * cards — strips the most common markdown syntax (headings, emphasis, links, images, code,
     * blockquotes, list bullets) rather than showing raw markdown characters, then truncates to
     * $maxLength on a whole-word boundary with a trailing ellipsis.
     *
     * @param string $markdown  Localised, unrendered markdown content.
     * @param int    $maxLength Maximum length of the returned excerpt, in characters.
     * @return string|null The plain-text excerpt, or null if there's no content to preview.
     */
    private function excerptFromMarkdown(string $markdown, int $maxLength = 240): ?string
    {
        $text = trim($markdown);

        if ($text === '') {
            return null;
        }

        $text = preg_replace('/```.*?```/s', ' ', $text) ?? $text;         // fenced code blocks
        $text = preg_replace('/`([^`]+)`/', '$1', $text) ?? $text;         // inline code
        $text = preg_replace('/!\[([^\]]*)]\([^)]*\)/', '$1', $text) ?? $text; // images -> alt text
        $text = preg_replace('/\[([^\]]*)]\([^)]*\)/', '$1', $text) ?? $text;  // links -> label
        $text = preg_replace('/^#{1,6}\s*/m', '', $text) ?? $text;         // headings
        $text = preg_replace('/(\*\*|__)(.*?)\1/', '$2', $text) ?? $text;  // bold
        $text = preg_replace('/(\*|_)(.*?)\1/', '$2', $text) ?? $text;     // italic
        $text = preg_replace('/^>\s?/m', '', $text) ?? $text;              // blockquotes
        $text = preg_replace('/^[-*+]\s+/m', '', $text) ?? $text;          // list bullets
        $text = trim(preg_replace('/\s+/', ' ', $text) ?? $text);          // collapse whitespace

        if ($text === '') {
            return null;
        }

        if (mb_strlen($text) <= $maxLength) {
            return $text;
        }

        // Cut on the last whole word within the limit so the excerpt doesn't end mid-word.
        $truncated = mb_substr($text, 0, $maxLength);
        $lastSpace = mb_strrpos($truncated, ' ');

        if ($lastSpace !== false) {
            $truncated = mb_substr($truncated, 0, $lastSpace);
        }

        return rtrim($truncated) . '…';
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
            ->set('views', 'COALESCE(views, 0) + 1', false)
            ->where('id', $eventId)
            ->update([], null, false);
    }

    /**
     * Counts stargazing events that have already taken place — i.e. whose
     * local (Orenburg) calendar date is before today. Used for aggregate
     * public statistics.
     *
     * @return int Number of conducted events.
     */
    public function getConductedCount(): int
    {
        return $this->where('date <', $this->startOfTodayOrenburg()->format('Y-m-d H:i:s'))
            ->countAllResults();
    }
}
