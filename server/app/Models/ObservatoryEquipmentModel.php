<?php

namespace App\Models;

use App\Entities\ObservatoryEquipmentEntity;

/**
 * ObservatoryEquipmentModel
 *
 * Manages the `observatory_equipment` table, which holds the observatory's equipment
 * inventory (cameras, mounts, scopes, focusers, etc.). Uses an auto-increment integer
 * primary key — no UUID generation callback is needed.
 */
class ObservatoryEquipmentModel extends ApplicationBaseModel
{
    protected $table            = 'observatory_equipment';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;  // PK is INT AUTO_INCREMENT per migration.
    protected $returnType       = ObservatoryEquipmentEntity::class;
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'equipment_type',
        'brand',
        'model',
        'specifications',
    ];

    // Dates
    protected $useTimestamps = false;

    // Validation
    protected $validationRules = [
        'equipment_type' => 'required|in_list[camera,mount,scope,guiding_scope,guiding_camera,filter_wheel,filter,focuser]',
        'brand'          => 'permit_empty|string|max_length[255]',
        'model'          => 'permit_empty|string|max_length[255]',
        'specifications' => 'permit_empty|string',
    ];

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
