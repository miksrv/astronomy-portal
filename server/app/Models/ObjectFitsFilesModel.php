<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Entities\ObjectFitsFileEntity;

class ObjectFitsFilesModel extends Model
{
    protected $table      = 'objects_fits_files';
    protected $primaryKey = 'id';
    protected $returnType = ObjectFitsFileEntity::class;
    protected $useSoftDeletes = true;

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

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    public function getObjectStatistic(): array {
        return $this
        ->select('object, filter, date_obs, exptime, file_size')
        ->findAll();
    }

    public function getFilesByObject(string $object)
    {
        return $this
        ->select('file_name, filter, date_obs, exptime, ccd_temp, gain, offset')
        ->where('object', $object)
        ->findAll();
    }
}
