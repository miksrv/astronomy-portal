<?php

namespace App\Models;

use App\Entities\PhotoAstrometryEntity;
use CodeIgniter\I18n\Time;

/**
 * PhotosAstrometryModel
 *
 * The plate solve of each photo (`photos_astrometry`, one row per photo, keyed by `photo_id`):
 * `enqueue()` starts one (`pending`), `AstrometrySolver::step()` moves it through `solving` to
 * `success` or `failed` and stores the result here.
 */
class PhotosAstrometryModel extends ApplicationBaseModel
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_SOLVING = 'solving';
    public const STATUS_SUCCESS = 'success';
    public const STATUS_FAILED  = 'failed';

    protected $table            = 'photos_astrometry';
    protected $primaryKey       = 'photo_id';
    protected $useAutoIncrement = false;
    protected $returnType       = PhotoAstrometryEntity::class;
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'photo_id',
        'status',
        'error',
        'submission_id',
        'job_id',
        'solved_width',
        'solved_height',
        'ra',
        'dec',
        'radius',
        'pixscale',
        'orientation',
        'parity',
        'wcs',
        'annotations',
        'solved_at',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Starts a solve: a new row, or an existing one back to `pending`. On a plain re-solve the
     * previous result stays until the new one arrives; with `$reset` (the picture was replaced)
     * it is cleared, since it describes pixels that no longer exist.
     */
    public function enqueue(string $photoId, bool $reset = false): void
    {
        if ($this->find($photoId)) {
            $data = ['status' => self::STATUS_PENDING, 'error' => null];

            if ($reset) {
                $data += [
                    'submission_id' => null,
                    'job_id'        => null,
                    'solved_width'  => null,
                    'solved_height' => null,
                    'ra'            => null,
                    'dec'           => null,
                    'radius'        => null,
                    'pixscale'      => null,
                    'orientation'   => null,
                    'parity'        => null,
                    'wcs'           => null,
                    'annotations'   => null,
                    'solved_at'     => null,
                ];
            }

            $this->update($photoId, $data);

            return;
        }

        $this->insert(['photo_id' => $photoId, 'status' => self::STATUS_PENDING]);
    }

    /**
     * The oldest photos with a solve under way, for `photos:solve`
     *
     * @return PhotoAstrometryEntity[]
     */
    public function getPending(int $limit): array
    {
        return $this->whereIn('status', [self::STATUS_PENDING, self::STATUS_SOLVING])
            ->orderBy('updated_at', 'ASC')
            ->findAll($limit);
    }

    /**
     * Photos that have no row at all (never solved), for the first run over the archive
     *
     * @return string[] Photo ids
     */
    public function getUnqueuedPhotoIds(): array
    {
        $rows = $this->db->table('photos')
            ->select('photos.id')
            ->join($this->table, "{$this->table}.photo_id = photos.id", 'left')
            ->where("{$this->table}.photo_id IS NULL")
            ->where('photos.deleted_at IS NULL')
            ->get()
            ->getResultArray();

        return array_column($rows, 'id');
    }

    /** The file went to the service: the solve is on its way, in this file's pixels */
    public function saveSubmission(string $photoId, int $submissionId, int $width, int $height): void
    {
        $this->update($photoId, [
            'status'        => self::STATUS_SOLVING,
            'submission_id' => $submissionId,
            'job_id'        => null,
            'solved_width'  => $width,
            'solved_height' => $height,
            'error'         => null,
        ]);
    }

    public function saveJob(string $photoId, int $jobId): void
    {
        $this->update($photoId, ['job_id' => $jobId]);
    }

    public function markFailed(string $photoId, string $error): void
    {
        $this->update($photoId, [
            'status' => self::STATUS_FAILED,
            'error'  => mb_substr($error, 0, 255),
        ]);
    }

    /**
     * Stores a successful solve
     *
     * @param array $calibration `ra`, `dec`, `radius`, `pixscale`, `orientation`, `parity`
     *                           as the service returns them
     * @param array $wcs         The parsed WCS header (AstrometryClient::parseWcsHeader)
     * @param array $annotations The service's annotations, as returned
     */
    public function saveSolution(string $photoId, int $jobId, array $calibration, array $wcs, array $annotations): void
    {
        $this->update($photoId, [
            'status'      => self::STATUS_SUCCESS,
            'error'       => null,
            'job_id'      => $jobId,
            'ra'          => $calibration['ra'] ?? null,
            'dec'         => $calibration['dec'] ?? null,
            'radius'      => $calibration['radius'] ?? null,
            'pixscale'    => $calibration['pixscale'] ?? null,
            'orientation' => $calibration['orientation'] ?? null,
            'parity'      => isset($calibration['parity']) ? (int) $calibration['parity'] : null,
            'wcs'         => json_encode($wcs),
            'annotations' => json_encode($annotations),
            'solved_at'   => Time::now('UTC')->format('Y-m-d H:i:s'),
        ]);
    }
}
