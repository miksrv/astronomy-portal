<?php namespace App\Models;

use CodeIgniter\Model;

class FilesModel extends Model
{
    protected $table      = 'files';
    protected $primaryKey = 'id';

    protected $useAutoIncrement = false;

    protected $returnType = \App\Entities\File::class;
    // protected $useSoftDeletes = true;

    // The updatable fields
    protected $allowedFields = [
        'id',
        'file_name',
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
        'object',
        'objctdec',
        'objctra',
        'sitelong',
        'sitelat',
        'bzero',
        'extend',
        'airmass',
        'star_count',
        'sky_background',
        'devitation',
        'sigma',
        'hfr',
        'fwhm',
    ];

    // Dates
    // protected $useTimestamps = false;
    // protected $dateFormat    = 'datetime';
    // protected $createdField  = 'created_at';
    // protected $updatedField  = 'updated_at';
    // protected $deletedField  = 'deleted_at';

    // Validation
    protected $validationRules      = [];
    protected $validationMessages   = [];
    protected $skipValidation       = false;
    protected $cleanValidationRules = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = [];
    protected $afterInsert    = [];
    protected $beforeUpdate   = [];
    protected $afterUpdate    = [];
    protected $beforeFind     = [];
    protected $afterFind      = [];
    protected $beforeDelete   = [];
    protected $afterDelete    = [];

    protected array $dataFields = [
        'object', 'filter', 'date_obs', 'exptime', 'object',
        'id', 'file_name', 'ccd_temp', 'offset', 'gain',
        'dec', 'ra', 'star_count', 'sky_background', 'hfr'
    ];

    public function findByObject(string $object): array
    {
        return $this
            ->select($this->dataFields)
            ->where(['object' => $object])->findAll();
    }
}