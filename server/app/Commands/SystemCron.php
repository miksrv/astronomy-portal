<?php

namespace App\Commands;

use App\Libraries\EmailQueueProcessor;
use App\Libraries\PaymentLibrary;
use App\Libraries\PushQueueProcessor;
use App\Models\EventsUsersModel;
use App\Models\PaymentsModel;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Throwable;

/**
 * The API's one cron job, every minute:
 *
 *   * * * * * php ~/path/to/server/spark system:cron
 *
 * In one process it releases the seats of expired unpaid bookings, then sends the
 * transactional emails, the mailing campaigns and the Web Push deliveries. An idle minute
 * costs one indexed query per queue and prints nothing: the mailer and the push client are
 * only built when something waits. A step that fails is logged and the next one still runs.
 *
 * A run that outlives its minute (a slow SMTP server: 50 emails × up to 5 s) holds a lock,
 * and the next run exits at once instead of sending the same queued rows a second time.
 */
class SystemCron extends BaseCommand
{
    protected $group       = 'system';
    protected $name        = 'system:cron';
    protected $description = 'Release expired booking holds and send the queued emails and push notifications';

    public function run(array $params)
    {
        $lock = $this->acquireLock();

        if ($lock === null) {
            return;
        }

        try {
            $this->step('booking holds', fn () => $this->releaseExpiredHolds());
            $this->step('transactional emails', fn () => $this->report('Transactional emails', (new EmailQueueProcessor())->processTransactional()));
            $this->step('mailings', fn () => $this->reportMailings((new EmailQueueProcessor())->processMailings()));
            $this->step('push', fn () => $this->report('Push notifications', (new PushQueueProcessor())->process()));
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /**
     * Seats held by unpaid bookings whose 20-minute payment hold ran out are freed, so an
     * abandoned booking doesn't block the event even when nobody books it. Every expired
     * payment is checked with the bank first: a failed or cancelled one frees its seat.
     */
    private function releaseExpiredHolds(): void
    {
        // The cheap indexed check first: the gateway client is only built when there is work
        if ((new PaymentsModel())->getExpiredPending(1) === []) {
            return;
        }

        $failedPaymentIds = [];

        foreach ((new PaymentLibrary())->releaseExpired() as ['payment' => $payment, 'status' => $status]) {
            if ($status === 'paid') {
                // The bank took the money after our hold ran out. Confirming or refunding it is
                // Events::reconcileBooking(), which lives in the controller; until it moves to
                // a library, a person handles it
                log_message('error', 'Payment {id} was paid after its hold expired: confirm the booking {booking} or refund it by hand', [
                    'id'      => $payment->id,
                    'booking' => $payment->entity_id,
                ]);

                continue;
            }

            if (in_array($status, ['failed', 'canceled'], true)) {
                $failedPaymentIds[] = $payment->id;
            }
        }

        (new EventsUsersModel())->releaseExpiredPendingByPaymentIds($failedPaymentIds);
    }

    /**
     * @param array{sent: int, errors: int}|null $result
     */
    private function report(string $label, ?array $result): void
    {
        if ($result === null) {
            return;
        }

        CLI::write($label . ': sent ' . $result['sent'] . ', errors ' . $result['errors'] . '.', $result['errors'] > 0 ? 'red' : 'green');
    }

    /**
     * @param array{sent: int, errors: int, limit: string|null, dayLeft: int, hourLeft: int}|null $result
     */
    private function reportMailings(?array $result): void
    {
        if ($result === null) {
            return;
        }

        if ($result['limit'] !== null) {
            CLI::write('Mailings: the ' . $result['limit'] . ' limit is reached, waiting.', 'yellow');

            return;
        }

        $this->report('Mailings', $result);
        CLI::write('  left today: ' . $result['dayLeft'] . ', this hour: ' . $result['hourLeft']);
    }

    private function step(string $name, callable $step): void
    {
        try {
            $step();
        } catch (Throwable $e) {
            log_message('error', 'system:cron, {step}: {exception}', ['step' => $name, 'exception' => $e]);
            CLI::error('system:cron, ' . $name . ': ' . $e->getMessage());
        }
    }

    /**
     * @return resource|null Null when another run still holds the lock
     */
    private function acquireLock()
    {
        $lock = fopen(WRITEPATH . 'cron.lock', 'c');

        if ($lock === false) {
            // No lock file (a read-only writable/?): run anyway rather than never
            log_message('warning', 'system:cron: cannot open the lock file, running without it');

            return fopen('php://memory', 'r');
        }

        if (!flock($lock, LOCK_EX | LOCK_NB)) {
            fclose($lock);

            return null;
        }

        return $lock;
    }
}
