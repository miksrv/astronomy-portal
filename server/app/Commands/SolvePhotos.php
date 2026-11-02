<?php

namespace App\Commands;

use App\Libraries\AstrometryClient;
use App\Libraries\AstrometrySolver;
use App\Models\PhotosAstrometryModel;
use App\Models\PhotosModel;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Throwable;

/**
 * Plate-solves photos on nova.astrometry.net from the command line: the backfill of the
 * archive, or one photo by hand. New uploads don't need it - the editor's browser drives their
 * solve through `POST /photos/:id/astrometry` (see AstrometrySolver). Each photo is taken
 * through `AstrometrySolver::step()` until it is final, about a minute each.
 *
 * ```bash
 * php spark photos:solve                # up to 3 pending photos
 * php spark photos:solve --limit 10
 * php spark photos:solve --all          # first queue every photo that was never solved
 * php spark photos:solve --photo ID     # (re)solve this one photo now
 * ```
 */
class SolvePhotos extends BaseCommand
{
    protected $group       = 'Observatory';
    protected $name        = 'photos:solve';
    protected $description = 'Plate-solve the queued photos on nova.astrometry.net';
    protected $options     = [
        '--limit' => 'How many queued photos to solve in this run (default 3)',
        '--all'   => 'Queue every photo that has never been solved before running',
        '--photo' => 'Queue this photo and solve it now, even if it was solved before',
    ];

    /** Seconds between polls of the service, and the most a photo may take */
    private const POLL_INTERVAL = 10;
    private const TIMEOUT       = 900;

    public function run(array $params): void
    {
        if (!AstrometryClient::isConfigured()) {
            CLI::error('astrometry.apiKey is not set in .env');

            return;
        }

        $model  = new PhotosAstrometryModel();
        $photos = new PhotosModel();
        // Spark hands the options over in $params as `--name value`; `--name=value` arrives as a
        // key with the value inside it, so split those too
        foreach ($params as $key => $value) {
            if (is_string($key) && str_contains($key, '=')) {
                [$name, $inline] = explode('=', $key, 2);
                $params[$name]   = $inline;
                unset($params[$key]);
            }
        }

        $limit  = max(1, (int) ($params['limit'] ?? 3));
        $photo  = $params['photo'] ?? null;
        $all    = array_key_exists('all', $params);

        if (is_string($photo) && $photo !== '') {
            if (!$photos->find($photo)) {
                CLI::error("Photo {$photo} not found");

                return;
            }

            $model->enqueue($photo);
            $queue = [$model->find($photo)];
        } else {
            if ($all) {
                $ids = $model->getUnqueuedPhotoIds();

                foreach ($ids as $id) {
                    $model->enqueue($id);
                }

                CLI::write('Queued photos: ' . count($ids));
            }

            $queue = $model->getPending($limit);
        }

        if (!$queue) {
            CLI::write('Nothing to solve', 'green');

            return;
        }

        $solver = AstrometrySolver::fromConfig();
        $done   = 0;

        foreach ($queue as $row) {
            $deadline = time() + self::TIMEOUT;

            while (AstrometrySolver::isInProgress($row) && time() < $deadline) {
                $row = $solver->step($row);

                if ($row->status === PhotosAstrometryModel::STATUS_SOLVING) {
                    CLI::write("{$row->photo_id}: submission {$row->submission_id}" . ($row->job_id ? ", job {$row->job_id}" : ''));
                }

                if (AstrometrySolver::isInProgress($row)) {
                    sleep(self::POLL_INTERVAL);
                }
            }

            if ($row->status === PhotosAstrometryModel::STATUS_SUCCESS) {
                $done++;
                CLI::write("{$row->photo_id}: solved", 'green');
            } else {
                CLI::error("{$row->photo_id}: " . ($row->error ?: 'timed out'));
            }
        }

        CLI::write("Solved: {$done} of " . count($queue), $done === count($queue) ? 'green' : 'yellow');
    }
}
