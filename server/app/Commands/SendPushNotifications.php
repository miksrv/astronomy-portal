<?php

/**
 * Cron command to process the push notification delivery queue.
 *
 * Run manually:
 *   php spark system:send-push
 *
 * Add to cron (runs every minute, alongside system:send-email):
 *   * * * * * cd /path/to/server && php spark system:send-push >> /dev/null 2>&1
 *
 * Unlike SendEmail, there is no day/hour rate-limit check here — push
 * services don't throttle by sender reputation the way SMTP providers do.
 * Still batched to bound per-run work.
 */

namespace App\Commands;

use App\Entities\PushNotificationDeliveryEntity;
use App\Entities\PushNotificationEntity;
use App\Libraries\WebPushExpiredSubscriptionException;
use App\Libraries\WebPushLibrary;
use App\Models\PushNotificationDeliveriesModel;
use App\Models\PushNotificationsModel;
use App\Models\PushSubscriptionsModel;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Exception;

class SendPushNotifications extends BaseCommand
{
    protected $group       = 'system';
    protected $name        = 'system:send-push';
    protected $description = 'Process and send queued Web Push notification deliveries';

    private const BATCH_SIZE = 50;

    public function run(array $params)
    {
        $deliveriesModel    = new PushNotificationDeliveriesModel();
        $notificationsModel = new PushNotificationsModel();
        $subscriptionsModel = new PushSubscriptionsModel();
        $webPushLibrary     = new WebPushLibrary();

        $batch = $deliveriesModel->getQueuedBatch(self::BATCH_SIZE);

        if (empty($batch)) {
            CLI::write('No queued push notifications to process.', 'yellow');
            return;
        }

        $sentCount            = 0;
        $errorCount           = 0;
        $affectedNotifications = [];

        foreach ($batch as $delivery) {
            /** @var PushNotificationDeliveryEntity $delivery */
            $notificationId = $delivery->notification_id;

            $notification = $notificationsModel->find($notificationId);
            $subscription = $subscriptionsModel->find($delivery->subscription_id);

            if (!$notification || !$subscription) {
                // Orphaned delivery row (campaign deleted, or the
                // subscription was already removed by an earlier run) —
                // mark rejected, nothing left to send.
                $deliveriesModel->update($delivery->id, ['status' => PushNotificationDeliveryEntity::STATUS_REJECTED]);
                continue;
            }

            $affectedNotifications[$notificationId] = true;

            $payload = [
                'title' => $notification->title,
                'body'  => $notification->body,
                'icon'  => $notification->getIconUrl(),
                'url'   => $notification->url,
            ];

            try {
                $webPushLibrary->send($subscription, $payload);

                $deliveriesModel->update($delivery->id, [
                    'status'  => PushNotificationDeliveryEntity::STATUS_SENT,
                    'sent_at' => date('Y-m-d H:i:s'),
                ]);

                $sentCount++;
            } catch (WebPushExpiredSubscriptionException $e) {
                log_message('info', 'Push subscription expired, removing: {exception}', ['exception' => $e]);

                // Mark the delivery rejected *before* removing the
                // subscription — push_notification_deliveries has an
                // ON DELETE CASCADE FK to push_subscriptions, so deleting
                // the subscription first would cascade-delete this very
                // delivery row and turn the update below into a no-op.
                $deliveriesModel->update($delivery->id, [
                    'status'        => PushNotificationDeliveryEntity::STATUS_REJECTED,
                    'error_message' => substr($e->getMessage(), 0, 500),
                ]);

                // Hard delete — push_subscriptions has no soft-deletes, a
                // dead endpoint carries no audit value.
                $subscriptionsModel->delete($subscription->id);

                $errorCount++;
            } catch (Exception $e) {
                log_message('error', 'SendPushNotifications command error for delivery ID ' . $delivery->id . ': {exception}', ['exception' => $e]);

                $deliveriesModel->update($delivery->id, [
                    'status'        => PushNotificationDeliveryEntity::STATUS_ERROR,
                    'error_message' => substr($e->getMessage(), 0, 500),
                ]);

                $errorCount++;
            }
        }

        // --- Update counts and check for completion ---
        foreach (array_keys($affectedNotifications) as $notificationId) {
            $notificationsModel->updateCounts($notificationId);

            $remaining = $deliveriesModel
                ->where('notification_id', $notificationId)
                ->where('status', PushNotificationDeliveryEntity::STATUS_QUEUED)
                ->countAllResults();

            if ($remaining === 0) {
                $notificationsModel->update($notificationId, [
                    'status' => PushNotificationEntity::STATUS_COMPLETED,
                ]);

                CLI::write('Push campaign ' . $notificationId . ' marked as completed.', 'green');
            }
        }

        // --- Print summary ---
        CLI::write('Push notification batch processing complete.', 'green');
        CLI::write('  Sent:   ' . $sentCount, 'green');
        CLI::write('  Errors: ' . $errorCount, $errorCount > 0 ? 'red' : 'green');
    }
}
