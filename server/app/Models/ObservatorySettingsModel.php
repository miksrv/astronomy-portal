<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Entities\ObservatorySettingsEntity;

class ObservatorySettingsModel extends Model
{
    protected $table      = 'observatory_settings';
    protected $primaryKey = 'key';
    protected $returnType = ObservatorySettingsEntity::class;
    protected $useSoftDeletes = false;

    protected $allowedFields = [
        'key',
        'value',
    ];

    protected $validationRules = [
        'key'   => 'required|max_length[200]|is_unique[observatory_settings.key]',
        'value' => 'max_length[200]',
    ];

    protected $validationMessages = [
        'key' => [
            'required'   => 'The key is required.',
            'max_length' => 'The key cannot exceed 200 characters.',
            'is_unique'  => 'This key already exists.',
        ],
        'value' => [
            'max_length' => 'The value cannot exceed 200 characters.',
        ],
    ];

    protected $useTimestamps = false;
}
