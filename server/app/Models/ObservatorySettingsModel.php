<?php

namespace App\Models;

use App\Entities\ObservatorySettingsEntity;

/**
 * ObservatorySettingsModel
 *
 * Manages the `observatory_settings` key-value store for observatory configuration.
 * The primary key is a string `key` column rather than a numeric ID.
 * This model extends ApplicationBaseModel (and therefore CI4's Model) to stay
 * consistent with the rest of the application's model hierarchy.
 */
class ObservatorySettingsModel extends ApplicationBaseModel
{
    protected $table            = 'observatory_settings';
    protected $primaryKey       = 'key';
    protected $useAutoIncrement = false;  // PK is a string key, not auto-increment.
    protected $returnType       = ObservatorySettingsEntity::class;
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'key',
        'value',
    ];

    // Dates
    protected $useTimestamps = false;

    // Validation
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
}
