<?php

namespace App\Libraries;

use App\Entities\PhotoAstrometryEntity;
use App\Models\PhotosAstrometryModel;
use App\Models\PhotosModel;
use CodeIgniter\I18n\Time;
use RuntimeException;
use Throwable;

/**
 * The plate solve of a photo as a state machine, advanced one step at a time without waiting:
 * `pending` → the `_large` file is uploaded and the row turns `solving`; `solving` → the
 * service is asked whether the job is done, and the row turns `success` (with the calibration,
 * the WCS and the annotations stored) or `failed`. Who calls `step()` decides the pace: the
 * editor's browser polls `POST /photos/:id/astrometry` every few seconds right after an upload
 * (no cron needed - photos are rare), `php spark photos:solve` loops over it for a backfill.
 */
class AstrometrySolver
{
    /** A job the service has not finished in this long is given up on */
    private const TIMEOUT_MINUTES = 30;

    public function __construct(
        private readonly AstrometryClient $client,
        private readonly PhotosAstrometryModel $model = new PhotosAstrometryModel(),
        private readonly PhotosModel $photos = new PhotosModel(),
        /** Where the photos' files are (`UPLOAD_PHOTOS`); a test points it elsewhere */
        private readonly string $uploadPath = UPLOAD_PHOTOS
    ) {
    }

    public static function fromConfig(): self
    {
        return new self(AstrometryClient::fromConfig());
    }

    /** Whether a row still has steps ahead of it */
    public static function isInProgress(PhotoAstrometryEntity $row): bool
    {
        return in_array($row->status, [PhotosAstrometryModel::STATUS_PENDING, PhotosAstrometryModel::STATUS_SOLVING], true);
    }

    /**
     * Advances the solve of a photo by one step and returns the row as it is afterwards. A
     * service or file error ends the solve as `failed`, with the reason in `error`; a row that
     * is already final is returned as is.
     */
    public function step(PhotoAstrometryEntity $row): PhotoAstrometryEntity
    {
        try {
            if ($row->status === PhotosAstrometryModel::STATUS_PENDING) {
                $this->upload($row);
            } elseif ($row->status === PhotosAstrometryModel::STATUS_SOLVING) {
                $this->poll($row);
            }
        } catch (Throwable $e) {
            $this->model->markFailed($row->photo_id, $e->getMessage());
        }

        return $this->model->find($row->photo_id);
    }

    private function upload(PhotoAstrometryEntity $row): void
    {
        $photo = $this->photos->find($row->photo_id);

        if (!$photo) {
            throw new RuntimeException('Photo not found');
        }

        $file = $this->uploadPath . $photo->dir_name . '/' . $photo->file_name . '_large.' . $photo->file_ext;

        if (!is_file($file)) {
            throw new RuntimeException('No large image file');
        }

        $size = getimagesize($file);

        if (!$size) {
            throw new RuntimeException('Unreadable image file');
        }

        $submissionId = $this->client->uploadFile($file);
        $this->model->saveSubmission($row->photo_id, $submissionId, $size[0], $size[1]);
    }

    private function poll(PhotoAstrometryEntity $row): void
    {
        $startedAt = $row->updated_at ? Time::parse($row->updated_at, 'UTC') : null;

        if ($startedAt && $startedAt->difference(Time::now('UTC'))->getMinutes() >= self::TIMEOUT_MINUTES) {
            throw new RuntimeException('The service did not finish in time');
        }

        $jobId = $row->job_id;

        if (!$jobId) {
            if (!$row->submission_id) {
                throw new RuntimeException('No submission to poll');
            }

            $jobId = $this->client->getJobId($row->submission_id);

            if (!$jobId) {
                // Still in the service's queue: nothing to do until the next step
                return;
            }

            $this->model->saveJob($row->photo_id, $jobId);
        }

        $status = $this->client->getJobStatus($jobId);

        if ($status === 'failure') {
            throw new RuntimeException('The field was not recognised');
        }

        if ($status !== 'success') {
            return;
        }

        $this->model->saveSolution(
            $row->photo_id,
            $jobId,
            $this->client->getCalibration($jobId),
            $this->client->getWcs($jobId),
            $this->client->getAnnotations($jobId)
        );
    }
}
