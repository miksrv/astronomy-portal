<?php namespace App\Models;

use CodeIgniter\Model;

class SettingsModel extends Model
{
    protected $table = 'settings';
    protected $primaryKey = 'key';

    protected $useAutoIncrement = false;

    protected $returnType = 'object';

    protected $allowedFields = ['key', 'value'];

    protected $useSoftDeletes = false;

    protected $beforeInsert = [];
    protected $beforeUpdate = [];
}