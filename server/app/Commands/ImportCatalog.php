<?php

namespace App\Commands;

use App\Libraries\CatalogLibrary;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use CodeIgniter\I18n\Time;
use Config\Database;
use Throwable;

/**
 * Imports the OpenNGC catalog (NGC + IC + addendum, CC BY-SA 4.0) into `catalog`, rebuilds
 * `catalog_aliases` and links our `objects` to it (`objects.catalog_id`). Idempotent: rows are
 * upserted by their OpenNGC name, so a new OpenNGC release is applied by running it again.
 *
 * ```bash
 * php spark catalog:import                 # download NGC.csv + addendum.csv from GitHub
 * php spark catalog:import --dir /path     # read them from a local folder instead
 * ```
 */
class ImportCatalog extends BaseCommand
{
    protected $group       = 'Observatory';
    protected $name        = 'catalog:import';
    protected $description = 'Import the OpenNGC deep-sky catalog and link our objects to it';
    protected $options     = [
        '--dir' => 'Folder with NGC.csv and addendum.csv (default: download from GitHub)',
    ];

    public function run(array $params): void
    {
        foreach ($params as $key => $value) {
            if (is_string($key) && str_contains($key, '=')) {
                [$name, $inline] = explode('=', $key, 2);
                $params[$name]   = $inline;
                unset($params[$key]);
            }
        }

        $dir = $params['dir'] ?? null;
        $rows = [];

        try {
            foreach (CatalogLibrary::SOURCE_FILES as $file) {
                $csv  = $this->read($file, is_string($dir) ? $dir : null);
                $part = CatalogLibrary::parseCsv($csv);
                CLI::write(sprintf('%-13s %6d rows', $file, count($part)));
                $rows = array_merge($rows, $part);
            }
        } catch (Throwable $e) {
            CLI::error('Could not read the catalog: ' . $e->getMessage());

            return;
        }

        $db  = Database::connect();
        $now = Time::now()->toDateTimeString();

        $objects = [];
        $skipped = 0;

        foreach ($rows as $row) {
            if (!CatalogLibrary::isObject($row)) {
                continue;
            }

            $catalogRow = CatalogLibrary::toCatalogRow($row);

            if ($catalogRow === null) {
                $skipped++;

                continue;
            }

            $objects[$catalogRow['name']] = $catalogRow + ['created_at' => $now, 'updated_at' => $now];
        }

        $db->transStart();

        // Upsert by OpenNGC name, then read the ids back
        foreach (array_chunk(array_values($objects), 500) as $chunk) {
            $db->table('catalog')->upsertBatch($chunk);
        }

        $ids = [];

        foreach ($db->table('catalog')->select('id, name, designation')->get()->getResultArray() as $row) {
            $ids[$row['name']]        = (int) $row['id'];
            $ids[$row['designation']] = (int) $row['id'];
        }

        // Aliases are rebuilt from scratch: the first object claiming an alias keeps it
        $aliases = [];
        $conflicts = 0;

        foreach ($rows as $row) {
            if (!CatalogLibrary::isObject($row) || !isset($ids[$row['Name']])) {
                continue;
            }

            foreach (CatalogLibrary::aliasesOf($row) as $alias) {
                if (isset($aliases[$alias]) && $aliases[$alias] !== $ids[$row['Name']]) {
                    $conflicts++;

                    continue;
                }

                $aliases[$alias] = $ids[$row['Name']];
            }
        }

        // Duplicate entries become aliases of the object they duplicate
        foreach ($rows as $row) {
            if (($row['Type'] ?? '') !== 'Dup') {
                continue;
            }

            $pair = CatalogLibrary::duplicateOf($row);

            if ($pair !== null && !isset($aliases[$pair[0]]) && isset($aliases[$pair[1]])) {
                $aliases[$pair[0]] = $aliases[$pair[1]];
            }
        }

        $db->table('catalog_aliases')->truncate();

        $aliasRows = array_map(
            static fn (string $alias, int $id) => ['alias' => $alias, 'catalog_id' => $id],
            array_keys($aliases),
            array_values($aliases)
        );

        foreach (array_chunk($aliasRows, 1000) as $chunk) {
            $db->table('catalog_aliases')->insertBatch($chunk);
        }

        // Link our objects
        $linked = 0;
        $unmatched = [];

        foreach ($db->table('objects')->select('catalog_name, catalog_id')->where('deleted_at', null)->get()->getResultArray() as $object) {
            $alias = CatalogLibrary::normalize($object['catalog_name']);
            $id    = $alias !== null ? ($aliases[$alias] ?? null) : null;

            if ($id === null) {
                $unmatched[] = $object['catalog_name'];
            }

            if ((int) $object['catalog_id'] !== (int) $id) {
                $db->table('objects')->where('catalog_name', $object['catalog_name'])->update(['catalog_id' => $id]);
            }

            $linked += $id !== null ? 1 : 0;
        }

        $db->transComplete();

        if (!$db->transStatus()) {
            CLI::error('Import failed, nothing was changed');

            return;
        }

        CLI::write(sprintf('catalog       %6d objects (%d components of multiple systems, like `IC0080 NED01`, skipped)', count($objects), $skipped), 'green');
        CLI::write(sprintf('aliases       %6d (%d conflicting aliases ignored)', count($aliasRows), $conflicts), 'green');
        CLI::write(sprintf('our objects   %6d linked, %d not in the catalog', $linked, count($unmatched)), 'green');

        if ($unmatched) {
            CLI::write('  not linked: ' . implode(', ', $unmatched));
        }
    }

    private function read(string $file, ?string $dir): string
    {
        if ($dir !== null) {
            $path = rtrim($dir, '/') . '/' . $file;
            $csv  = @file_get_contents($path);

            if ($csv === false) {
                throw new \RuntimeException("cannot read {$path}");
            }

            return $csv;
        }

        $response = service('curlrequest')->get(CatalogLibrary::SOURCE_URL . $file, ['timeout' => 60, 'http_errors' => false]);

        if ($response->getStatusCode() !== 200) {
            throw new \RuntimeException("{$file}: HTTP " . $response->getStatusCode());
        }

        return $response->getBody();
    }
}
