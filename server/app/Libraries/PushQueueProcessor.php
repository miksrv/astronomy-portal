<?php

namespace App\Libraries;

use App\Entities\PushNotificationDeliveryEntity;
use App\Entities\PushNotificationEntity;
use App\Models\PushNotificationDeliveriesModel;
use App\Models\PushNotificationsModel;
use App\Models\PushSubscriptionsModel;
use Closure;
use Exception;

/**
 * Drains the Web Push delivery queue (`push_notification_deliveries`) for `system:cron`.
 *
 * No day/hour cap, unlike email: push services don't throttle by sender reputation the way
 * SMTP providers do; still batched to bound one run. The VAPID client is only built when
 * something is queued, and before the first delivery, so a broken config fails the whole run. A subscription the push service reports gone (404/410) is deleted.
 */
class PushQueueProcessor
{
    public const BATCH_SIZE = 50;

    private ?WebPushLibrary $webPush = null;

    private Closure $webPushFactory;

    /**
     * @param Closure|null $webPushFactory Builds the sender when the first push goes out (tests pass a fake)
     */
    public function __construct(
        ?Closure $webPushFactory = null,
        private readonly PushNotificationDeliveriesModel $deliveriesModel = new PushNotificationDeliveriesModel(),
        private readonly PushNotificationsModel $notificationsModel = new PushNotificationsModel(),
        private readonly PushSubscriptionsModel $subscriptionsModel = new PushSubscriptionsModel(),
    ) {
        $this->webPushFactory = $webPushFactory ?? static fn (): WebPushLibrary => new WebPushLibrary();
    }

    /**
     * @return array{sent: int, errors: int}|null Null when the queue was empty
     */
    public function process(): ?array
    {
        if (!$this->deliveriesModel->hasQueued()) {
            return null;
        }

        // Built before the loop, outside the per-delivery catch: a broken VAPID config fails the
        // run (logged by the cron) and leaves the deliveries queued, not marked failed one by one
        $webPush  = $this->webPush();
        $sent     = 0;
        $errors   = 0;
        $affected = [];

        foreach ($this->deliveriesModel->getQueuedBatch(self::BATCH_SIZE) as $delivery) {
            /** @var PushNotificationDeliveryEntity $delivery */
            $notificationId = $delivery->notification_id;
            $notification   = $this->notificationsModel->find($notificationId);
            $subscription   = $delivery->subscription_id ? $this->subscriptionsModel->find($delivery->subscription_id) : null;

            if (!$notification || !$subscription) {
                // The campaign was deleted, or an earlier run already removed the subscription
                $this->deliveriesModel->update($delivery->id, ['status' => PushNotificationDeliveryEntity::STATUS_REJECTED]);
                continue;
            }

            $affected[$notificationId] = true;

            try {
                $webPush->send($subscription, [
                    'title' => $notification->title,
                    'body'  => $notification->body,
                    'icon'  => $notification->getIconUrl(),
                    'url'   => $notification->url,
                ]);

                $this->deliveriesModel->update($delivery->id, [
                    'status'  => PushNotificationDeliveryEntity::STATUS_SENT,
                    'sent_at' => date('Y-m-d H:i:s'),
                ]);

                $sent++;
            } catch (WebPushExpiredSubscriptionException $e) {
                log_message('info', 'Push subscription expired, removing: {exception}', ['exception' => $e]);

                // The delivery row stays as the audit record: its subscription_id FK is
                // ON DELETE SET NULL, not CASCADE
                $this->deliveriesModel->update($delivery->id, [
                    'status'        => PushNotificationDeliveryEntity::STATUS_REJECTED,
                    'error_message' => substr($e->getMessage(), 0, 500),
                ]);

                // Hard delete: push_subscriptions has no soft deletes, a dead endpoint is worth nothing
                $this->subscriptionsModel->delete($subscription->id);
                $errors++;
            } catch (Exception $e) {
                log_message('error', 'Push delivery {id} failed: {exception}', ['id' => $delivery->id, 'exception' => $e]);

                $this->deliveriesModel->update($delivery->id, [
                    'status'        => PushNotificationDeliveryEntity::STATUS_ERROR,
                    'error_message' => substr($e->getMessage(), 0, 500),
                ]);

                $errors++;
            }
        }

        foreach (array_keys($affected) as $notificationId) {
            $this->notificationsModel->updateCounts($notificationId);

            $remaining = $this->deliveriesModel
                ->where('notification_id', $notificationId)
                ->where('status', PushNotificationDeliveryEntity::STATUS_QUEUED)
                ->countAllResults();

            if ($remaining === 0) {
                $this->notificationsModel->update($notificationId, ['status' => PushNotificationEntity::STATUS_COMPLETED]);
            }
        }

        return ['sent' => $sent, 'errors' => $errors];
    }

    private function webPush(): WebPushLibrary
    {
        return $this->webPush ??= ($this->webPushFactory)();
    }
}
