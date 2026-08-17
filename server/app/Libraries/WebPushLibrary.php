<?php

/**
 * Thin wrapper around Minishlink\WebPush\WebPush, analogous to EmailLibrary.
 *
 * VAPID keys are read from Config\Push (env vars push.vapidPublicKey /
 * push.vapidPrivateKey / push.vapidSubject). Generate a pair once via:
 *
 *   php -r "require 'vendor/autoload.php'; print_r(\Minishlink\WebPush\VAPID::createVapidKeys());"
 *
 * and store them in .env — see server/app/Config/Push.php. Regenerating the
 * keys invalidates every existing push_subscriptions row, so this is a one-time setup step,
 * not a routine credential rotation.
 */

namespace App\Libraries;

use App\Entities\PushSubscriptionEntity;
use Config\Push;
use Exception;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushLibrary
{
    private WebPush $webPush;

    public function __construct()
    {
        $this->webPush = new WebPush([
            'VAPID' => [
                'subject'    => Push::vapidSubject(),
                'publicKey'  => Push::vapidPublicKey(),
                'privateKey' => Push::vapidPrivateKey(),
            ],
        ]);
    }

    /**
     * Sends a single push notification to one subscription.
     *
     * @param PushSubscriptionEntity $subscription The recipient's subscription row.
     * @param array                  $payload      JSON-encodable payload consumed by client/public/sw.js
     *                                             (shape: { title, body, icon?, url? }).
     * @throws WebPushExpiredSubscriptionException When the push service reports the
     *                                              subscription as gone (HTTP 404/410) —
     *                                              caller should delete the subscription row.
     * @throws Exception For any other delivery failure.
     */
    public function send(PushSubscriptionEntity $subscription, array $payload): void
    {
        $sub = Subscription::create([
            'endpoint' => $subscription->endpoint,
            'keys'     => [
                'p256dh' => $subscription->p256dh,
                'auth'   => $subscription->auth_key,
            ],
        ]);

        $report = $this->webPush->sendOneNotification($sub, json_encode($payload));

        $this->assertReportSucceeded($report);
    }

    /**
     * Translates a MessageSentReport into either a no-op (success) or the
     * appropriate exception. Split out from send() so the mapping can be
     * unit-tested against a manually-built report — no real HTTP call —
     * the same way EmailLibraryTest exercises attach() via reflection.
     *
     * @throws WebPushExpiredSubscriptionException When the push service reports the
     *                                              subscription as gone (HTTP 404/410).
     * @throws Exception For any other delivery failure.
     */
    private function assertReportSucceeded(MessageSentReport $report): void
    {
        if ($report->isSuccess()) {
            return;
        }

        if ($report->isSubscriptionExpired()) {
            throw new WebPushExpiredSubscriptionException($report->getReason());
        }

        throw new Exception($report->getReason());
    }
}
