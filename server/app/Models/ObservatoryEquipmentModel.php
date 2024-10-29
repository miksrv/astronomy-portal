<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Entities\ObservatoryEquipmentEntity;

class ObservatoryEquipmentModel extends Model
{
    protected $table      = 'observatory_equipment';
    protected $primaryKey = 'id';
    protected $returnType = ObservatoryEquipmentEntity::class;
    protected $useAutoIncrement = true;
    protected $useSoftDeletes = false;

    protected $allowedFields = [
        'equipment_type',
        'brand',
        'model',
        'specifications'
    ];

    protected $useTimestamps = false;

    protected $validationRules = [
        'equipment_type' => 'required|in_list[camera,mount,scope,guiding_scope,guiding_camera,filter_wheel,filter,focuser]',
        'brand'          => 'permit_empty|string|max_length[255]',
        'model'          => 'permit_empty|string|max_length[255]',
        'specifications' => 'permit_empty|string'
    ];
}
