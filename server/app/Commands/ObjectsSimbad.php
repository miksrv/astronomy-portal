<?php

namespace App\Commands;

use App\Libraries\ObjectSimbadLibrary;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Config\Database;
use Config\Simbad;
use Throwable;

/**
 * Fills the objects from SIMBAD (FEAT-31): type, angular size, magnitude (when empty), the
 * SIMBAD id and the other names. A new object is filled on `POST /objects`; this command is for
 * the existing ones, run once after the migration. It only reports unless `--apply` is given.
 *
 * An object whose SIMBAD position is farther than `Simbad::MATCH_DEGREES` from ours is only
 * reported: our coordinates may be wrong (M 94 with RA in hours) or the name may resolve to
 * another object (`Abell 74` → a galaxy cluster). After checking the report, list the ones to
 * take from SIMBAD, coordinates included, with `--accept`. A name that resolves to a neighbour
 * close by (NGC 6888 → its Wolf–Rayet star) is a "match" too: leave it out with `--skip`.
 *
 * ```bash
 * php spark objects:simbad                          # report, change nothing
 * php spark objects:simbad --apply                  # store the matches
 * php spark objects:simbad --apply --accept M_94,IC_405
 * php spark objects:simbad --apply --skip NGC_6888       # SIMBAD gives its central star
 * php spark objects:simbad --object M_33 --apply    # one object, even if it was looked up before
 * php spark objects:simbad --all                    # also the objects looked up before
 * ```
 */
class ObjectsSimbad extends BaseCommand
{
    protected $group       = 'Observatory';
    protected $name        = 'objects:simbad';
    protected $description = 'Fill the objects from SIMBAD (report only without --apply)';
    protected $options     = [
        '--apply'  => 'Store the results (without it the command only reports)',
        '--accept' => 'Comma-separated objects to take from SIMBAD even when its position is far from ours',
        '--skip'   => 'Comma-separated objects to leave alone (SIMBAD resolves them to another object)',
        '--object' => 'Only this object (looked up again even if it was before)',
        '--all'    => 'Also the objects that were looked up before',
    ];

    /** CDS asks to keep it to a few queries a second; each lookup is two */
    private const PAUSE_MICROSECONDS = 400_000;

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

        $apply  = array_key_exists('apply', $params);
        $all    = array_key_exists('all', $params);
        $only   = is_string($params['object'] ?? null) ? $params['object'] : null;
        $accept = self::names($params['accept'] ?? null);
        $skip   = self::names($params['skip'] ?? null);

        $db    = Database::connect();
        $query = $db->table('objects')->select('catalog_name, ra, dec, magnitude')->where('deleted_at', null);

        if ($only !== null) {
            $query->where('catalog_name', $only);
        } elseif (!$all) {
            $query->where('simbad_checked_at', null);
        }

        if ($skip) {
            $query->whereNotIn('catalog_name', $skip);
        }

        $objects = $query->orderBy('catalog_name')->get()->getResultArray();

        if (!$objects) {
            CLI::write('Nothing to look up');

            return;
        }

        $categories = [];

        foreach ($db->table('objects_categories')->select('object_name, category_id')->get()->getResultArray() as $row) {
            $categories[$row['object_name']][] = (int) $row['category_id'];
        }

        $library = new ObjectSimbadLibrary();
        $counts  = ['match' => 0, 'far' => 0, 'not_found' => 0, 'moving' => 0, 'error' => 0];

        CLI::write(sprintf('%-24s %-10s %8s  %-28s %-6s %-14s %s', 'object', 'status', 'offset°', 'SIMBAD', 'type', 'size′', 'mag'), 'yellow');

        foreach ($objects as $object) {
            $name = $object['catalog_name'];

            try {
                $result = $library->check($object, $categories[$name] ?? [], in_array($name, $accept, true));
            } catch (Throwable $e) {
                $counts['error']++;
                CLI::write(sprintf('%-24s %-10s %s', $name, 'error', $e->getMessage()), 'red');

                continue;
            }

            $counts[$result['status']]++;
            $simbad = $result['simbad'];
            $size   = $simbad && $simbad['majAxis'] ? round($simbad['majAxis'], 1) . ($simbad['minAxis'] ? '×' . round($simbad['minAxis'], 1) : '') : '';
            $note   = $result['status'] === 'far'
                ? (in_array($name, $accept, true) ? '  accepted: coordinates from SIMBAD' : '  NOT stored: check, then --accept ' . $name)
                : '';

            CLI::write(
                sprintf(
                    '%-24s %-10s %8s  %-28s %-6s %-14s %s%s',
                    $name,
                    $result['status'],
                    $result['offset'] !== null ? number_format($result['offset'], 2) : '',
                    $simbad['simbadId'] ?? '',
                    $simbad['type'] ?? '',
                    $size,
                    $simbad['magnitude'] ?? '',
                    $note
                ),
                $result['status'] === 'far' ? 'red' : null
            );

            if ($apply && $result['update']) {
                $db->table('objects')->where('catalog_name', $name)->update($result['update']);
            }

            if ($result['status'] !== 'moving') {
                usleep(self::PAUSE_MICROSECONDS);
            }
        }

        CLI::newLine();
        CLI::write(sprintf(
            'match %d · far %d · not found %d · moving %d · errors %d (far = more than %s° from our coordinates)',
            $counts['match'],
            $counts['far'],
            $counts['not_found'],
            $counts['moving'],
            $counts['error'],
            Simbad::MATCH_DEGREES
        ), 'green');

        if (!$apply) {
            CLI::write('Report only: run with --apply to store', 'yellow');
        } else {
            \Config\Services::cache()->deleteMatching('objects_list_*');
        }
    }

    /** `M_94,IC_405` → ['M_94', 'IC_405']; a flag without a value gives none */
    private static function names(mixed $value): array
    {
        return is_string($value) ? array_values(array_filter(array_map('trim', explode(',', $value)))) : [];
    }
}
