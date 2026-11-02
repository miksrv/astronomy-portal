<?php

namespace App\Models;

use App\Entities\PhotosObjectEntity;

/**
 * PhotosObjectModel
 *
 * Manages the `photos_objects` pivot table that maps astrophotos to the
 * astronomical objects they depict. Uses UUID primary keys generated via
 * the beforeInsert callback.
 */
class PhotosObjectModel extends ApplicationBaseModel
{
    protected $table            = 'photos_objects';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = PhotosObjectEntity::class;
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'photo_id',
        'object_id',
    ];

    // Dates
    protected $useTimestamps = false;

    // Validation
    protected $validationRules = [
        'photo_id'  => 'required|max_length[15]',
        'object_id' => 'required|max_length[255]',
    ];

    protected $validationMessages = [
        'photo_id' => [
            'required'   => 'Photo ID is required.',
            'max_length' => 'Photo ID cannot exceed 15 characters.',
        ],
        'object_id' => [
            'required'   => 'Object ID is required.',
            'max_length' => 'Object ID cannot exceed 255 characters.',
        ],
    ];

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];
    protected $afterInsert    = [];
    protected $beforeUpdate   = [];
    protected $afterUpdate    = [];
    protected $beforeFind     = [];
    protected $afterFind      = [];
    protected $beforeDelete   = [];
    protected $afterDelete    = [];

    /**
     * The newest photo of every object (its cover in the catalog) and the number of photos.
     *
     * @return array<string, array{photosCount: int, cover: array{id: string, date: string|null, dirName: string, fileName: string, fileExt: string}}>
     *               Keyed by object name.
     */
    public function getObjectCovers(): array
    {
        $rows = $this->db->table($this->table)
            ->select('photos_objects.object_id, photos.id, photos.date, photos.dir_name, photos.file_name, photos.file_ext')
            ->join('photos', 'photos.id = photos_objects.photo_id')
            ->where('photos.deleted_at', null)
            // Tie-breakers keep the cover stable when two photos share a date
            ->orderBy('photos.date', 'DESC')
            ->orderBy('photos.created_at', 'DESC')
            ->orderBy('photos.id', 'DESC')
            ->get()
            ->getResultArray();

        $result = [];

        foreach ($rows as $row) {
            $object = $row['object_id'];

            if (!isset($result[$object])) {
                $result[$object] = [
                    'photosCount' => 0,
                    'cover'       => [
                        'id'       => $row['id'],
                        'date'     => $row['date'],
                        'dirName'  => $row['dir_name'],
                        'fileName' => $row['file_name'],
                        'fileExt'  => $row['file_ext'],
                    ],
                ];
            }

            $result[$object]['photosCount']++;
        }

        return $result;
    }
}
