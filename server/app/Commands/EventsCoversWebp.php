<?php

namespace App\Commands;

use App\Libraries\EventCoverLibrary;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Config\Database;
use Throwable;

/**
 * Converts the covers of events stored before WebP (JPEG, PNG, GIF) to WebP, the 585×400 preview
 * too, under a new name (`cover-<random>`), and points the event at the new file. A new cover is stored as WebP on upload
 * (`EventCoverLibrary`); this command is for the existing ones, run once. It only reports unless
 * `--apply` is given. The old files are removed once the WebP ones are written, unless `--keep`.
 *
 * ```bash
 * php spark events:covers-webp                  # report: which covers, how big
 * php spark events:covers-webp --apply          # convert, remove the old files
 * php spark events:covers-webp --apply --keep   # convert, keep the old files too
 * php spark events:covers-webp --event 6a7a00b8973c3 --apply
 * ```
 */
class EventsCoversWebp extends BaseCommand
{
    protected $group       = 'Events';
    protected $name        = 'events:covers-webp';
    protected $description = 'Convert the event covers to WebP (report only without --apply)';
    protected $options     = [
        '--apply' => 'Convert (without it the command only reports)',
        '--keep'  => 'Keep the old JPEG/PNG files next to the WebP ones',
        '--event' => 'Only this event',
    ];

    public function run(array $params): void
    {
        // `--name=value` arrives as a key with the value inside it
        foreach ($params as $key => $value) {
            if (is_string($key) && str_contains($key, '=')) {
                [$name, $inline] = explode('=', $key, 2);
                $params[$name]   = $inline;
                unset($params[$key]);
            }
        }

        $apply = array_key_exists('apply', $params);
        $keep  = array_key_exists('keep', $params);
        $only  = is_string($params['event'] ?? null) ? $params['event'] : null;

        // `--event` without an ID would otherwise convert every event
        if (array_key_exists('event', $params) && ($only === null || trim($only) === '')) {
            CLI::error('--event needs an event ID');

            return;
        }

        $db = Database::connect();

        // Deleted events too: their folders take the same space
        $query = $db->table('events')
            ->select('id, cover_file_name, cover_file_ext')
            ->where('cover_file_name IS NOT NULL')
            ->where('cover_file_ext IS NOT NULL')
            ->where('cover_file_ext !=', EventCoverLibrary::EXT);

        if ($only !== null) {
            $query->where('id', $only);
        }

        $events = $query->orderBy('date')->get()->getResultArray();

        if (!$events) {
            CLI::write('Nothing to convert: every cover is WebP already.', 'green');

            return;
        }

        $covers = new EventCoverLibrary();
        $before = 0;
        $after  = 0;
        $failed = 0;
        $found  = 0;

        foreach ($events as $event) {
            $file = UPLOAD_EVENTS . $event['id'] . '/' . $event['cover_file_name'] . '.' . $event['cover_file_ext'];

            if (!is_file($file)) {
                CLI::write("{$event['id']}: no file {$event['cover_file_name']}.{$event['cover_file_ext']}, skipped", 'yellow');

                continue;
            }

            $found++;

            if (!$apply) {
                $size = filesize($file);
                $before += $size;
                CLI::write(sprintf('%s: %s.%s, %s', $event['id'], $event['cover_file_name'], $event['cover_file_ext'], self::size($size)));

                continue;
            }

            try {
                $result = $covers->toWebp($event['id'], $event['cover_file_name'], $event['cover_file_ext']);

                $db->table('events')->where('id', $event['id'])->update([
                    'cover_file_name' => $result['name'],
                    'cover_file_ext'  => EventCoverLibrary::EXT,
                ]);

                // Only once the event points at the WebP files: a failed update keeps the old ones
                if (!$keep) {
                    $covers->removeOtherCovers($event['id'], $result['name']);
                }

                $before += $result['before'];
                $after  += $result['after'];

                CLI::write(sprintf('%s: %s → %s', $event['id'], self::size($result['before']), self::size($result['after'])), 'green');
            } catch (Throwable $e) {
                $failed++;
                CLI::error("{$event['id']}: {$e->getMessage()}");
            }
        }

        CLI::newLine();

        if (!$apply) {
            CLI::write(sprintf('%d covers to convert, %s. Run with --apply to convert.', $found, self::size($before)));

            return;
        }

        CLI::write(
            sprintf('Done: %s → %s%s.', self::size($before), self::size($after), $failed ? ", {$failed} failed" : ''),
            $failed ? 'yellow' : 'green'
        );
    }

    private static function size(int $bytes): string
    {
        return $bytes >= 1048576 ? round($bytes / 1048576, 1) . ' MB' : round($bytes / 1024) . ' KB';
    }
}
