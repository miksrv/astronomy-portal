<?php namespace App\Models;

use CodeIgniter\Model;

class PhotoModel extends Model
{
    protected $table      = 'photos';
    protected $primaryKey = 'id';

    protected $useAutoIncrement = true;

    protected $returnType     = \App\Entities\Photo::class;
    protected $useSoftDeletes = true;

    // The updatable fields
    protected $allowedFields = ['object', 'date', 'author', 'file', 'file_ext'];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';
}