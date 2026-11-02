<?php

namespace App\Models;

use App\Entities\ObjectFitsFileEntity;

/**
 * ObjectFitsFilesModel
 *
 * Manages the `objects_fits_files` table, which stores metadata extracted from
 * FITS (Flexible Image Transport System) files associated with astronomical objects.
 * Supports soft deletes. The primary key is an application-assigned string.
 */
class ObjectFitsFilesModel extends ApplicationBaseModel
{
    protected $table            = 'objects_fits_files';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = ObjectFitsFileEntity::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'object_id',
        'file_name',
        'file_size',
        'ypixsz',
        'xpixsz',
        'naxis1',
        'naxis2',
        'naxis',
        'bscale',
        'simple',
        'bitpix',
        'xbinning',
        'ybinning',
        'exptime',
        'frame',
        'aptdia',
        'focallen',
        'comment',
        'telescop',
        'observer',
        'instrume',
        'pixsize1',
        'pixsize2',
        'ccd_temp',
        'offset',
        'gain',
        'scale',
        'date_obs',
        'equinox',
        'filter',
        'dec',
        'ra',
        'objctdec',
        'objctra',
        'sitelong',
        'sitelat',
        'bzero',
        'extend',
        'object',
        'airmass',
        'star_count',
        'sky_background',
        'devitation',
        'sigma',
        'hfr',
        'fwhm',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    // Dates
    protected $useTimestamps = true;
    protected $createdField       = 'created_at';
    protected $updatedField       = 'updated_at';
    protected $deletedField       = 'deleted_at';

    /**
     * Retrieves a summary of all FITS files: object name, filter, observation date,
     * exposure time, and file size. Used for telescope statistics aggregation.
     *
     * @return array Array of ObjectFitsFileEntity objects with the selected fields.
     */
    public function getObjectStatistic(): array
    {
        return $this
            ->select('object, filter, date_obs, exptime, file_size')
            ->findAll();
    }

    /**
     * SQL expression for the observing night a frame belongs to: `date_obs` is UTC and the
     * observatory is UTC+5, so a night runs from local noon (07:00 UTC) to the next local
     * noon and is named after the evening it started on.
     */
    public const NIGHT_EXPRESSION = 'DATE(DATE_SUB(date_obs, INTERVAL 7 HOUR))';

    /**
     * Counts the observing nights of every object (or one) and their first/last night.
     *
     * @param string|null $object Optional catalog name to summarise a single object.
     * @return array<string, array{nights: int, firstNight: string|null, lastNight: string|null}>
     *               Keyed by object name.
     */
    public function getNightsSummary(?string $object = null): array
    {
        $night = self::NIGHT_EXPRESSION;
        $query = $this
            ->select("object, COUNT(DISTINCT {$night}) AS nights, MIN({$night}) AS first_night, MAX({$night}) AS last_night", false)
            ->where('date_obs IS NOT NULL')
            ->groupBy('object');

        if ($object !== null) {
            $query->where('object', $object);
        }

        $result = [];

        foreach ($query->asArray()->findAll() as $row) {
            $result[$row['object']] = [
                'nights'     => (int) $row['nights'],
                'firstNight' => $row['first_night'],
                'lastNight'  => $row['last_night'],
            ];
        }

        return $result;
    }

    /**
     * The optical train most of an object's frames were taken with: focal length, aperture,
     * pixel size, sensor size (after binning) and the plate scale, straight from the FITS
     * headers. Several setups may have shot one object; the one with the most frames wins.
     *
     * @return array{focalLength: int|null, aperture: int|null, pixelSize: float|null, width: int|null, height: int|null, binning: int|null, scale: float|null, frames: int}|null
     */
    public function getObjectOptics(string $object): ?array
    {
        $row = $this
            ->select('focallen, aptdia, xpixsz, naxis1, naxis2, xbinning, scale, COUNT(*) AS frames', false)
            ->where('object', $object)
            ->where('focallen IS NOT NULL')
            ->groupBy('focallen, aptdia, xpixsz, naxis1, naxis2, xbinning, scale')
            ->orderBy('frames', 'DESC')
            ->asArray()
            ->first();

        if (!$row) {
            return null;
        }

        return [
            'focalLength' => $row['focallen'] !== null ? (int) $row['focallen'] : null,
            'aperture'    => $row['aptdia'] !== null ? (int) $row['aptdia'] : null,
            'pixelSize'   => $row['xpixsz'] !== null ? (float) $row['xpixsz'] : null,
            'width'       => $row['naxis1'] !== null ? (int) $row['naxis1'] : null,
            'height'      => $row['naxis2'] !== null ? (int) $row['naxis2'] : null,
            'binning'     => $row['xbinning'] !== null ? (int) $row['xbinning'] : null,
            'scale'       => $row['scale'] !== null ? (float) $row['scale'] : null,
            'frames'      => (int) $row['frames'],
        ];
    }

    /**
     * Retrieves imaging data for all FITS files associated with a specific object.
     *
     * @param string $object The object name (catalog name) to filter by.
     * @return array Array of ObjectFitsFileEntity objects with file and imaging metadata.
     */
    public function getFilesByObject(string $object): array
    {
        return $this
            ->select('file_name, filter, date_obs, exptime, ccd_temp, gain, offset')
            ->where('object', $object)
            ->findAll();
    }
}
