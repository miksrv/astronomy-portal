<?php

namespace Config;

/**
 * Thin env-var accessor for the Web Push VAPID credentials, mirroring the
 * pattern used by MailingLimits / app.siteUrl elsewhere in this codebase.
 *
 * VAPID keys are generated once (see server/app/Libraries/WebPushLibrary.php
 * doc-block for how) and stored in .env — regenerating them invalidates
 * every existing push_subscriptions row, so treat this as a one-time,
 * deliberate setup step, not a routine credential rotation.
 */
class Push
{
    public static function vapidPublicKey(): string
    {
        return (string) getenv('push.vapidPublicKey');
    }

    public static function vapidPrivateKey(): string
    {
        return (string) getenv('push.vapidPrivateKey');
    }

    public static function vapidSubject(): string
    {
        return (string) getenv('push.vapidSubject');
    }
}
