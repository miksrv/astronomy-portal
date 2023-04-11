<?php namespace App\Models;

use CodeIgniter\Model;

class CatalogModel extends Model
{
    protected $table      = 'catalog';
    protected $primaryKey = 'name';

    protected $useAutoIncrement = false;

    protected $returnType     = \App\Entities\Catalog::class;
    protected $useSoftDeletes = true;

    // The updatable fields
    protected $allowedFields = ['name', 'title', 'text', 'coord_ra', 'coord_dec'];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    // Validation
    protected $validationRules      = [
        'name'      => 'required|string|min_length[3]|max_length[40]|is_unique[catalog.name]',
        'title'     => 'max_length[200]',
        'coord_ra'  => 'decimal',
        'coord_dec' => 'decimal',
    ];
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
}