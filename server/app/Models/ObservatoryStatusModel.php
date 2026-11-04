<?php

namespace App\Models;

use CodeIgniter\I18n\Time;
use Config\Observatory;

/**
 * ObservatoryStatusModel
 *
 * The latest status snapshot pushed by the observatory agent (`observatory_status`, a single
 * row) and the event log (`observatory_events`). The snapshot is stored as the agent sent it;
 * `publicView()` decides what visitors see.
 */
class ObservatoryStatusModel extends ApplicationBaseModel
{
    protected $table          = 'observatory_status';
    protected $primaryKey     = 'id';
    protected $returnType     = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields  = ['id', 'snapshot', 'received_at'];

    /** Top-level snapshot sections visitors may see (power, disk, errors stay internal) */
    public const PUBLIC_SECTIONS = ['time', 'indi', 'devices', 'mount', 'camera', 'guider', 'filter', 'focuser', 'roof', 'weather', 'watchdog', 'scheduler'];

    /** Event types worth showing publicly in "recent activity" */
    public const PUBLIC_EVENTS = [
        'indi_online', 'indi_offline', 'roof_opened', 'roof_closed', 'mount_parked', 'mount_unparked',
        'weather_alert', 'weather_ok', 'job_started', 'job_finished', 'agent_started',
    ];

    /** Events stored from one push (the agent queues up to 200 while the link is down) */
    public const MAX_EVENTS_PER_PUSH = 200;

    /**
     * Stores a new snapshot (replacing the previous one) and appends its events.
     *
     * @param array $snapshot decoded agent body without `events`
     * @param array $events   [{type, device?, time?, payload?}]
     */
    public function store(array $snapshot, array $events): void
    {
        $now = Time::now('UTC')->toDateTimeString();

        $this->db->transStart();

        $this->db->table($this->table)->replace([
            'id'          => 1,
            'snapshot'    => json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'received_at' => $now,
        ]);

        $rows = [];

        foreach ($events as $event) {
            if (!is_array($event) || !is_string($event['type'] ?? null) || !preg_match('/^[a-z_]{1,40}$/', $event['type'])) {
                continue;
            }

            $time = $now;

            if (is_string($event['time'] ?? null)) {
                try {
                    $time = Time::parse($event['time'])->setTimezone('UTC')->toDateTimeString();
                } catch (\Throwable) {
                    // keep the receive time
                }
            }

            $rows[] = [
                'type'       => $event['type'],
                'device'     => is_string($event['device'] ?? null) ? mb_substr($event['device'], 0, 60) : null,
                'payload'    => isset($event['payload']) ? json_encode($event['payload'], JSON_UNESCAPED_UNICODE) : null,
                'created_at' => $time,
            ];
        }

        if ($rows) {
            // After a long outage the agent sends its whole backlog: keep the newest events
            $this->db->table('observatory_events')->insertBatch(array_slice($rows, -self::MAX_EVENTS_PER_PUSH));
            $this->db->table('observatory_events')
                ->where('created_at <', Time::now('UTC')->subDays(Observatory::EVENTS_KEEP_DAYS)->toDateTimeString())
                ->delete();
        }

        $this->db->transComplete();

        if (!$this->db->transStatus()) {
            throw new \RuntimeException('Could not store the observatory status');
        }
    }

    /**
     * The status as the site shows it: `online` (a snapshot within ONLINE_SECONDS), when it was
     * received, and the public sections of the snapshot.
     */
    public function publicView(): array
    {
        $row = $this->find(1);

        if (!$row) {
            return ['online' => false, 'updatedAt' => null, 'snapshot' => null];
        }

        $received = Time::parse($row['received_at'], 'UTC');
        $snapshot = json_decode($row['snapshot'], true) ?: [];

        return [
            'online'    => $received->getTimestamp() >= time() - Observatory::ONLINE_SECONDS,
            'updatedAt' => $received->format('Y-m-d\TH:i:s\Z'),
            'snapshot'  => array_intersect_key($snapshot, array_flip(self::PUBLIC_SECTIONS)),
        ];
    }

    /**
     * Recent public events, newest first.
     */
    public function recentEvents(int $limit = 20): array
    {
        $rows = $this->db->table('observatory_events')
            ->whereIn('type', self::PUBLIC_EVENTS)
            ->orderBy('created_at', 'DESC')
            ->orderBy('id', 'DESC')
            ->limit(max(1, min($limit, 50)))
            ->get()
            ->getResultArray();

        return array_map(static fn (array $row) => [
            'id'     => (int) $row['id'],
            'type'   => $row['type'],
            'device' => $row['device'],
            'time'   => Time::parse($row['created_at'], 'UTC')->format('Y-m-d\TH:i:s\Z'),
        ], $rows);
    }
}
