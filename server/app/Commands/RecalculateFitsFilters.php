<?php

namespace App\Commands;

use App\Entities\ObjectFitsFiltersEntity;
use App\Models\ObjectFitsFilesModel;
use App\Models\ObjectFitsFiltersModel;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

/**
 * CLI command that recalculates aggregated FITS filter statistics for every astronomical object.
 *
 * The command reads all raw FITS file records from the `objects_fits_files` table,
 * groups them by object name and normalized filter name (L, R, G, B, H, O, S),
 * then upserts the aggregated totals (frame count, total exposure time, total file size)
 * into the `objects_fits_filters` table. Only rows whose values actually changed are written
 * to the database, so re-running the command is safe and idempotent.
 *
 * ### Usage
 *
 * ```bash
 * # Run via CodeIgniter Spark CLI
 * php spark fits:recalculate
 *
 * # Or using the Composer shortcut
 * composer serve   # make sure the database is accessible first
 * php spark fits:recalculate
 * ```
 *
 * ### When to run
 *
 * - After a bulk import of new FITS files into the database.
 * - After manual edits to `objects_fits_files` records (filter names, exposure times, etc.).
 * - As a periodic cron job to keep aggregate statistics in sync:
 *   `0 3 * * * cd /path/to/server && php spark fits:recalculate`
 *
 * ### Algorithm
 *
 * 1. Load every row from `objects_fits_files` via {@see ObjectFitsFilesModel::getObjectStatistic()}.
 * 2. Normalize each filter name using the `mappingFilters()` helper
 *    (e.g. "luminance" → "L", "ha" → "H").
 * 3. Accumulate `frames_count`, `exposure_time` and `files_size` per (object, filter) pair.
 * 4. For each pair, load the existing aggregate from `objects_fits_filters`
 *    (or create a new {@see ObjectFitsFiltersEntity}).
 * 5. Compare computed values with stored ones; save only if something changed.
 * 6. Print the total number of updated aggregates.
 *
 * @see ObjectFitsFilesModel    Source of raw FITS file records
 * @see ObjectFitsFiltersModel  Target model for aggregated filter statistics
 * @see ObjectFitsFiltersEntity Entity representing a single aggregate row
 * @see \App\Helpers\filters_helper::mappingFilters() Filter name normalization
 */
class RecalculateFitsFilters extends BaseCommand
{
    protected $group       = 'Observatory';
    protected $name        = 'fits:recalculate';
    protected $description = 'Recalculate FITS filter aggregates for all objects';

    /**
     * Execute the FITS filter recalculation.
     *
     * Iterates over all FITS file records, aggregates statistics by object and filter,
     * and persists only the changed aggregates to the database.
     *
     * @param array<string> $params CLI parameters (not used by this command).
     *
     * @return void
     */
    public function run(array $params): void
    {
        helper('filters');

        CLI::write('Starting FITS filter recalculation...', 'yellow');

        $dataObjects = [];
        $filterModel = new ObjectFitsFiltersModel();
        $filesModel  = new ObjectFitsFilesModel();
        $filesData   = $filesModel->getObjectStatistic();

        foreach ($filesData as $file) {
            $filter = mappingFilters($file->filter);

            if (!isset($dataObjects[$file->object][$filter])) {
                $dataObjects[$file->object][$filter] = [
                    'frames_count'  => 1,
                    'exposure_time' => $file->exptime,
                    'files_size'    => $file->file_size
                ];
            } else {
                $dataObjects[$file->object][$filter] = [
                    'frames_count'  => $dataObjects[$file->object][$filter]['frames_count'] + 1,
                    'exposure_time' => $dataObjects[$file->object][$filter]['exposure_time'] + $file->exptime,
                    'files_size'    => $dataObjects[$file->object][$filter]['files_size'] + $file->file_size
                ];
            }
        }

        $updatedCount = 0;

        foreach ($dataObjects as $objectName => $filter) {
            foreach ($filter as $filterName => $filterData) {
                $objectFitsFilters =
                    $filterModel->getDataByObjectFilter($objectName, $filterName)
                    ?? new ObjectFitsFiltersEntity();

                $objectFitsFilters->object_name = $objectName;
                $objectFitsFilters->filter      = $filterName;

                if ((int) $filterData['frames_count'] !== $objectFitsFilters->frames_count) {
                    $objectFitsFilters->frames_count = (int) $filterData['frames_count'];
                }

                if ((float) $filterData['exposure_time'] !== $objectFitsFilters->exposure_time) {
                    $objectFitsFilters->exposure_time = (float) $filterData['exposure_time'];
                }

                if ((float) $filterData['files_size'] !== $objectFitsFilters->files_size) {
                    $objectFitsFilters->files_size = (float) $filterData['files_size'];
                }

                if ($objectFitsFilters->hasChanged('frames_count')
                    || $objectFitsFilters->hasChanged('exposure_time')
                    || $objectFitsFilters->hasChanged('files_size'))
                {
                    $filterModel->save($objectFitsFilters);
                    $updatedCount++;
                }
            }
        }

        CLI::write("Done. Updated {$updatedCount} filter aggregate(s).", 'green');
    }
}
