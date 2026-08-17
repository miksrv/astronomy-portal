<?php

namespace App\Models;

use App\Entities\PushNotificationEntity;

/**
 * PushNotificationsModel
 *
 * Manages the `push_notifications` table, which stores browser push
 * campaign records — title/body/icon/url, delivery status, and aggregate
 * sent/error counts. Mirrors MailingsModel. Supports soft deletes and UUID
 * primary keys.
 */
class PushNotificationsModel extends ApplicationBaseModel
{
    protected $table            = 'push_notifications';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = PushNotificationEntity::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'title',
        'body',
        'icon',
        'url',
        'status',
        'audience_type',
        'audience_event_id',
        'total_count',
        'sent_count',
        'error_count',
        'created_by',
        'sent_at',
    ];

    // Dates
    protected $useTimestamps = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];

    /**
     * Recalculates sent_count and error_count from the
     * push_notification_deliveries table and persists the updated totals.
     *
     * error_count folds in both 'error' (a real send failure) and
     * 'rejected' (subscription was expired/orphaned, so nothing was even
     * attempted) statuses — otherwise rejected rows would never be
     * reflected in either counter, and sent_count + error_count would
     * silently fall short of total_count whenever a targeted device's
     * subscription had expired.
     *
     * @param string $notificationId The push notification campaign id to update.
     */
    public function updateCounts(string $notificationId): void
    {
        $deliveriesModel = new PushNotificationDeliveriesModel();

        $sentCount  = $deliveriesModel->countByNotificationAndStatus($notificationId, 'sent');
        $errorCount = $deliveriesModel->countByNotificationAndStatus($notificationId, 'error')
            + $deliveriesModel->countByNotificationAndStatus($notificationId, 'rejected');

        $this->update($notificationId, [
            'sent_count'  => $sentCount,
            'error_count' => $errorCount,
        ]);
    }
}
