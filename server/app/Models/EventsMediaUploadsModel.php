<?php

namespace App\Models;

use App\Entities\EventMediaUploadEntity;
use CodeIgniter\I18n\Time;

/**
 * EventsMediaUploadsModel
 *
 * Manages the `events_media_uploads` table — bookkeeping for in-progress
 * chunked event-media (photo/video) uploads (FEAT-26). Not soft-deleted:
 * this is ephemeral state, not gallery content, and is either removed
 * outright by Events::mediaCancel() or swept up by the
 * media:cleanup-uploads command once it's stale (see getStaleSessions()).
 */
class EventsMediaUploadsModel extends ApplicationBaseModel
{
    protected $table            = 'events_media_uploads';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = EventMediaUploadEntity::class;
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'event_id',
        'user_id',
        'media_type',
        'original_file_name',
        'mime_type',
        'total_size',
        'chunk_size',
        'received_bytes',
        'status',
    ];

    // Dates — created_at/updated_at are DB-defaulted (CURRENT_TIMESTAMP), not
    // application-managed.
    protected $useTimestamps = false;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    // Validation
    protected $validationRules      = [];
    protected $validationMessages   = [];
    protected $skipValidation       = true;
    protected $cleanValidationRules = true;

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
     * Returns every upload session stuck in an in-progress status
     * ('uploading' or 'finalizing') whose row is older than $hours — an
     * abandoned session (tab closed, network dropped for good) that
     * media:cleanup-uploads should purge along with its temp chunk
     * directory.
     *
     * @param int $hours Age threshold in hours. Default 24, per Business Rule 8.
     * @return EventMediaUploadEntity[]
     */
    public function getStaleSessions(int $hours = 24): array
    {
        $cutoff = Time::now('UTC')->subHours($hours)->format('Y-m-d H:i:s');

        $rows = $this->whereIn('status', [
            EventMediaUploadEntity::STATUS_UPLOADING,
            EventMediaUploadEntity::STATUS_FINALIZING,
        ])
            ->where('created_at <', $cutoff)
            ->findAll();

        return $rows ?: [];
    }
}
