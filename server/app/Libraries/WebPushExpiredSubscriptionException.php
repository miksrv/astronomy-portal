<?php

namespace App\Libraries;

/**
 * Thrown by WebPushLibrary::send() when the push service reports the
 * subscription as gone (HTTP 404/410). The caller is expected to delete the
 * corresponding push_subscriptions row on catch — see
 * App\Commands\SendPushNotifications and PushNotifications::test().
 */
class WebPushExpiredSubscriptionException extends \Exception
{
}
