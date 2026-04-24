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
