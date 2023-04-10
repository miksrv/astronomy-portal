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
    // protected $allowedFields = ['name', 'title'];

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
            ->select(implode(', ', $this->dataFields))
            ->where(['object' => $object])->findAll();
    }
}