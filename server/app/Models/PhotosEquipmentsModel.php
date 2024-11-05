<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Entities\PhotosEquipmentsEntity;

class PhotosEquipmentsModel extends Model
{
    protected $table      = 'photos_equipments';
    protected $primaryKey = 'id';
    protected $returnType = PhotosEquipmentsEntity::class;

    protected $allowedFields = [
        'photo_id',
        'equipment_id',
    ];

    protected $validationRules = [
        'photo_id'     => 'required|max_length[15]',
        'equipment_id' => 'required|is_natural_no_zero',
    ];

    protected $validationMessages = [
        'photo_id' => [
            'required'   => 'Photo ID is required.',
            'max_length' => 'Photo ID cannot exceed 15 characters.',
        ],
        'equipment_id' => [
            'required'           => 'Equipment ID is required.',
            'is_natural_no_zero' => 'Equipment ID must be a positive integer.',
        ],
    ];

    protected $useTimestamps = false;
}
