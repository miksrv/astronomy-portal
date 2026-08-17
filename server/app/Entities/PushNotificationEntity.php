<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class PushNotificationEntity extends Entity
{
    const STATUS_DRAFT     = 'draft';
    const STATUS_SENDING   = 'sending';
    const STATUS_COMPLETED = 'completed';
    const STATUS_PAUSED    = 'paused';

    protected $attributes = [
        'id'                 => null,
        'title'              => null,
        'body'               => null,
        'icon'               => null,
        'url'                => null,
        'status'             => 'draft',
        'audience_type'      => 'all',
        'audience_event_id'  => null,
        'total_count'        => 0,
        'sent_count'         => 0,
        'error_count'        => 0,
        'created_by'         => null,
        'sent_at'            => null,
    ];

    protected $dates = [
        'sent_at',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'id'                 => 'string',
        'title'              => 'string',
        'body'               => 'string',
        'icon'               => 'string',
        'url'                => 'string',
        'status'             => 'string',
        'audience_type'      => 'string',
        'audience_event_id'  => 'string',
        'total_count'        => 'int',
        'sent_count'         => 'int',
        'error_count'        => 'int',
        'created_by'         => 'string',
        'sent_at'            => 'datetime',
    ];

    /**
     * Absolute URL of the campaign icon, for embedding in an actual push
     * payload (test send or the queued delivery). `icon` is stored as a
     * bare relative path (see PushNotifications::upload()); the service
     * worker's push handler resolves a relative icon against its own
     * scope (the frontend origin), not the API host, so it must be made
     * absolute here before it ever reaches a payload — same reasoning as
     * Mailings::renderNewsletterBody()'s imageUrl.
     */
    public function getIconUrl(): ?string
    {
        if (empty($this->icon)) {
            return null;
        }

        return rtrim(getenv('app.baseURL'), '/') . '/' . $this->icon;
    }
}
