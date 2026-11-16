<?php

use App\Entities\PushSubscriptionEntity;
use App\Libraries\EmailLibrary;
use App\Libraries\EmailQueueProcessor;
use App\Libraries\PushQueueProcessor;
use App\Libraries\WebPushExpiredSubscriptionException;
use App\Libraries\WebPushLibrary;
use App\Models\MailingEmailsModel;
use CodeIgniter\Test\CIUnitTestCase;
use Config\Database;

/**
 * The send steps of `system:cron` against real tables on SQLite: an empty queue builds no
 * mailer and no push client, queued rows are sent and marked, campaigns complete, a gone
 * push subscription is deleted, and the mailing caps hold the campaigns back.
 *
 * @internal
 */
final class CronQueuesTest extends CIUnitTestCase
{
    /** @var list<array{to: string, subject: string}> */
    private array $sent = [];

    private int $mailersBuilt = 0;

    private int $pushClientsBuilt = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $db = Database::connect();
        foreach (['email_queue', 'mailings', 'mailing_emails', 'push_notifications', 'push_notification_deliveries', 'push_subscriptions'] as $table) {
            $db->query('DROP TABLE IF EXISTS "' . $table . '"');
        }

        $timestamps = 'created_at DATETIME, updated_at DATETIME';
        $db->query("CREATE TABLE email_queue (id VARCHAR(15) PRIMARY KEY, email VARCHAR(255), subject VARCHAR(255), body TEXT, attachment_path VARCHAR(255), ics_attachment_path VARCHAR(255), status VARCHAR(10), attempts INT DEFAULT 0, error_message TEXT, sent_at DATETIME, {$timestamps})");
        $db->query("CREATE TABLE mailings (id VARCHAR(15) PRIMARY KEY, subject VARCHAR(255), content TEXT, image VARCHAR(255), status VARCHAR(10), audience_type VARCHAR(10), audience_event_id VARCHAR(15), total_count INT DEFAULT 0, sent_count INT DEFAULT 0, error_count INT DEFAULT 0, created_by VARCHAR(15), sent_at DATETIME, {$timestamps}, deleted_at DATETIME NULL)");
        $db->query("CREATE TABLE mailing_emails (id VARCHAR(15) PRIMARY KEY, mailing_id VARCHAR(15), user_id VARCHAR(15), email VARCHAR(255), locale VARCHAR(2), status VARCHAR(10), error_message TEXT, sent_at DATETIME, {$timestamps})");
        $db->query("CREATE TABLE push_notifications (id VARCHAR(15) PRIMARY KEY, title VARCHAR(255), body TEXT, icon VARCHAR(255), url VARCHAR(255), status VARCHAR(10), audience_type VARCHAR(10), audience_event_id VARCHAR(15), total_count INT DEFAULT 0, sent_count INT DEFAULT 0, error_count INT DEFAULT 0, created_by VARCHAR(15), sent_at DATETIME, {$timestamps}, deleted_at DATETIME NULL)");
        $db->query("CREATE TABLE push_notification_deliveries (id VARCHAR(15) PRIMARY KEY, notification_id VARCHAR(15), subscription_id VARCHAR(15) NULL, user_id VARCHAR(15), status VARCHAR(10), error_message TEXT, sent_at DATETIME, {$timestamps})");
        $db->query("CREATE TABLE push_subscriptions (id VARCHAR(15) PRIMARY KEY, user_id VARCHAR(15), endpoint VARCHAR(500), p256dh VARCHAR(255), auth_key VARCHAR(255), user_agent VARCHAR(255), {$timestamps})");
    }

    private function mailerFactory(): Closure
    {
        return function (): EmailLibrary {
            $this->mailersBuilt++;
            $test = $this;

            return new class ($test) extends EmailLibrary {
                public function __construct(private readonly CronQueuesTest $test)
                {
                }

                public function send(string $mailTo, string $subject, string $message): void
                {
                    $this->test->recordSend($mailTo, $subject);
                }

                public function sendWithAttachment(string $mailTo, string $subject, string $message, ?string $attachmentPath = null, ?string $icsPath = null, string $icsName = 'event.ics'): void
                {
                    if ($mailTo === 'broken@example.com') {
                        throw new RuntimeException('SMTP said no');
                    }

                    $this->test->recordSend($mailTo, $subject);
                }
            };
        };
    }

    public function recordSend(string $to, string $subject): void
    {
        $this->sent[] = ['to' => $to, 'subject' => $subject];
    }

    /**
     * @param list<string> $goneEndpoints Endpoints the push service answers 410 for
     */
    private function pushFactory(array $goneEndpoints = []): Closure
    {
        return function () use ($goneEndpoints): WebPushLibrary {
            $this->pushClientsBuilt++;
            $test = $this;

            return new class ($test, $goneEndpoints) extends WebPushLibrary {
                public function __construct(private readonly CronQueuesTest $test, private readonly array $gone)
                {
                }

                public function send(PushSubscriptionEntity $subscription, array $payload): void
                {
                    if (in_array($subscription->endpoint, $this->gone, true)) {
                        throw new WebPushExpiredSubscriptionException('410 Gone');
                    }

                    $this->test->recordSend($subscription->endpoint, $payload['title']);
                }
            };
        };
    }

    /** A mailing model whose sent-today/this-hour counts are fixed: they are MySQL date math */
    private function mailingEmails(int $today = 0, int $thisHour = 0): MailingEmailsModel
    {
        return new class ($today, $thisHour) extends MailingEmailsModel {
            public function __construct(private readonly int $today, private readonly int $thisHour)
            {
                parent::__construct();
            }

            public function countSentToday(): int
            {
                return $this->today;
            }

            public function countSentThisHour(): int
            {
                return $this->thisHour;
            }
        };
    }

    public function testEmptyQueuesBuildNothing(): void
    {
        $email = new EmailQueueProcessor($this->mailerFactory(), mailingEmailsModel: $this->mailingEmails());

        $this->assertNull($email->processTransactional());
        $this->assertNull($email->processMailings());
        $this->assertNull((new PushQueueProcessor($this->pushFactory()))->process());
        $this->assertSame(0, $this->mailersBuilt);
        $this->assertSame(0, $this->pushClientsBuilt);
    }

    public function testTransactionalSentAndRetriedOnFailure(): void
    {
        $db = Database::connect();
        $db->table('email_queue')->insertBatch([
            ['id' => 't1', 'email' => 'anna@example.com', 'subject' => 'Ticket', 'body' => '<p>1</p>', 'status' => 'queued', 'attempts' => 0, 'created_at' => '2026-11-16 10:00:00'],
            ['id' => 't2', 'email' => 'broken@example.com', 'subject' => 'Ticket', 'body' => '<p>2</p>', 'status' => 'queued', 'attempts' => 2, 'created_at' => '2026-11-16 10:01:00'],
            ['id' => 't3', 'email' => 'old@example.com', 'subject' => 'Old', 'body' => '<p>3</p>', 'status' => 'sent', 'attempts' => 0, 'created_at' => '2026-11-15 10:00:00'],
        ]);

        $result = (new EmailQueueProcessor($this->mailerFactory()))->processTransactional();

        $this->assertSame(['sent' => 1, 'errors' => 1], $result);
        $this->assertSame(1, $this->mailersBuilt);
        $this->assertSame([['to' => 'anna@example.com', 'subject' => 'Ticket']], $this->sent);
        $this->assertSame('sent', $db->table('email_queue')->where('id', 't1')->get()->getRow()->status);

        // The third failed attempt gives up
        $failed = $db->table('email_queue')->where('id', 't2')->get()->getRow();
        $this->assertSame('error', $failed->status);
        $this->assertSame(3, (int) $failed->attempts);
    }

    public function testMailingSentAndCampaignCompleted(): void
    {
        $db = Database::connect();
        $db->table('mailings')->insert(['id' => 'm1', 'subject' => 'Астровыезд', 'content' => 'Текст', 'status' => 'sending']);
        $db->table('mailings')->insert(['id' => 'm2', 'subject' => 'Отменённая', 'content' => 'Текст', 'status' => 'canceled']);
        $db->table('mailing_emails')->insertBatch([
            ['id' => 'e1', 'mailing_id' => 'm1', 'email' => 'anna@example.com', 'locale' => 'ru', 'status' => 'queued', 'created_at' => '2026-11-16 10:00:00'],
            ['id' => 'e2', 'mailing_id' => 'm2', 'email' => 'boris@example.com', 'locale' => 'ru', 'status' => 'queued', 'created_at' => '2026-11-16 10:00:01'],
        ]);

        $result = (new EmailQueueProcessor($this->mailerFactory(), mailingEmailsModel: $this->mailingEmails(10, 5)))->processMailings();

        $this->assertSame(1, $result['sent']);
        $this->assertNull($result['limit']);
        $this->assertSame([['to' => 'anna@example.com', 'subject' => 'Астровыезд']], $this->sent);
        $this->assertSame('canceled', $db->table('mailing_emails')->where('id', 'e2')->get()->getRow()->status);

        $mailing = $db->table('mailings')->where('id', 'm1')->get()->getRow();
        $this->assertSame('completed', $mailing->status);
        $this->assertSame(1, (int) $mailing->sent_count);
    }

    public function testMailingCapHoldsTheCampaignBack(): void
    {
        $db = Database::connect();
        $db->table('mailings')->insert(['id' => 'm1', 'subject' => 'Астровыезд', 'content' => 'Текст', 'status' => 'sending']);
        $db->table('mailing_emails')->insert(['id' => 'e1', 'mailing_id' => 'm1', 'email' => 'anna@example.com', 'status' => 'queued']);

        $result = (new EmailQueueProcessor($this->mailerFactory(), mailingEmailsModel: $this->mailingEmails(0, \Config\MailingLimits::HOUR_LIMIT)))->processMailings();

        $this->assertSame('hour', $result['limit']);
        $this->assertSame(0, $this->mailersBuilt);
        $this->assertSame('queued', $db->table('mailing_emails')->where('id', 'e1')->get()->getRow()->status);
    }

    public function testBrokenPushConfigLeavesTheQueueUntouched(): void
    {
        $db = Database::connect();
        $db->table('push_notifications')->insert(['id' => 'n1', 'title' => 'Астровыезд', 'body' => 'Текст', 'status' => 'sending']);
        $db->table('push_subscriptions')->insert(['id' => 's1', 'endpoint' => 'https://push.example.com/alive', 'p256dh' => 'k', 'auth_key' => 'a']);
        $db->table('push_notification_deliveries')->insert(['id' => 'd1', 'notification_id' => 'n1', 'subscription_id' => 's1', 'status' => 'queued']);

        $processor = new PushQueueProcessor(static function (): WebPushLibrary {
            throw new ErrorException('Invalid VAPID private key');
        });

        try {
            $processor->process();
            $this->fail('A broken push config must fail the run');
        } catch (ErrorException) {
            $this->assertSame('queued', $db->table('push_notification_deliveries')->where('id', 'd1')->get()->getRow()->status);
        }
    }

    public function testPushSentGoneSubscriptionDeletedAndCampaignCompleted(): void
    {
        $db = Database::connect();
        $db->table('push_notifications')->insert(['id' => 'n1', 'title' => 'Астровыезд в субботу', 'body' => 'Регистрация открыта', 'status' => 'sending']);
        $db->table('push_subscriptions')->insertBatch([
            ['id' => 's1', 'endpoint' => 'https://push.example.com/alive', 'p256dh' => 'k', 'auth_key' => 'a'],
            ['id' => 's2', 'endpoint' => 'https://push.example.com/gone', 'p256dh' => 'k', 'auth_key' => 'a'],
        ]);
        $db->table('push_notification_deliveries')->insertBatch([
            ['id' => 'd1', 'notification_id' => 'n1', 'subscription_id' => 's1', 'status' => 'queued', 'created_at' => '2026-11-16 10:00:00'],
            ['id' => 'd2', 'notification_id' => 'n1', 'subscription_id' => 's2', 'status' => 'queued', 'created_at' => '2026-11-16 10:00:01'],
            // Its subscription was deleted earlier (FK SET NULL): rejected, not sent to anybody
            ['id' => 'd3', 'notification_id' => 'n1', 'subscription_id' => null, 'status' => 'queued', 'created_at' => '2026-11-16 10:00:02'],
        ]);

        $result = (new PushQueueProcessor($this->pushFactory(['https://push.example.com/gone'])))->process();

        $this->assertSame(['sent' => 1, 'errors' => 1], $result);
        $this->assertSame([['to' => 'https://push.example.com/alive', 'subject' => 'Астровыезд в субботу']], $this->sent);

        $statuses = array_column($db->table('push_notification_deliveries')->orderBy('id')->get()->getResultArray(), 'status', 'id');
        $this->assertSame(['d1' => 'sent', 'd2' => 'rejected', 'd3' => 'rejected'], $statuses);
        $this->assertSame(0, $db->table('push_subscriptions')->where('id', 's2')->countAllResults());
        $this->assertSame('completed', $db->table('push_notifications')->where('id', 'n1')->get()->getRow()->status);
    }
}
