<?php

namespace App\Models;

use App\Entities\PushNotificationDeliveryEntity;

/**
 * PushNotificationDeliveriesModel
 *
 * Manages the `push_notification_deliveries` table, which stores one row
 * per (notification, subscription) pair — a user with several subscribed
 * devices gets several rows for the same campaign. Mirrors
 * MailingEmailsModel. Uses UUID primary keys generated via the beforeInsert
 * callback; no soft deletes.
 *
 * `subscription_id` is nullable with an ON DELETE SET NULL FK to
 * push_subscriptions (see FixPushNotificationDeliveriesSubscriptionCascade)
 * — a row must survive as a permanent send-audit record (status intact)
 * even after SendPushNotifications hard-deletes the subscription it
 * targeted, the same way a mailing_emails row survives an unsubscribe.
 */
class PushNotificationDeliveriesModel extends ApplicationBaseModel
{
    protected $table            = 'push_notification_deliveries';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = PushNotificationDeliveryEntity::class;
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'notification_id',
        'subscription_id',
        'user_id',
        'status',
        'error_message',
        'sent_at',
    ];

    // Dates
    protected $useTimestamps = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];

    /**
     * Counts delivery rows for a given notification filtered by status.
     */
    public function countByNotificationAndStatus(string $notificationId, string $status): int
    {
        return $this
            ->where('notification_id', $notificationId)
            ->where('status', $status)
            ->countAllResults();
    }

    /**
     * Returns the next batch of queued deliveries ordered by creation time ascending.
     *
     * @return PushNotificationDeliveryEntity[]
     */
    public function getQueuedBatch(int $limit = 50): array
    {
        return $this->where('status', 'queued')
                    ->orderBy('created_at', 'ASC')
                    ->findAll($limit);
    }
}
