<?php

namespace App\Libraries;

use App\Models\EmailQueueModel;
use App\Models\UsersModel;

/**
 * E-mails to a job's author (FEAT-30 §4.9), queued in `email_queue` and sent by
 * `system:send-email`. In the author's language. Failures are logged, never thrown: a lost
 * notification must never undo an approval or a status change.
 */
class TelescopeMailer
{
    public function approved(array $job): void
    {
        $this->send($job, 'Approved', null);
    }

    public function rejected(array $job, ?string $reason): void
    {
        $this->send($job, 'Rejected', $reason);
    }

    public function firstFrames(array $job): void
    {
        $this->send($job, 'FirstFrames', null);
    }

    public function completed(array $job): void
    {
        $this->send($job, 'Completed', null);
    }

    public function expired(array $job): void
    {
        $this->send($job, 'Expired', null);
    }

    /**
     * @param array $job a `telescope_jobs` row
     */
    private function send(array $job, string $kind, ?string $reason): void
    {
        // The agent's own jobs (the patrol) have no author to write to
        if (empty($job['user_id'])) {
            return;
        }

        try {
            $user = (new UsersModel())->find($job['user_id']);

            if (!$user || empty($user->email)) {
                return;
            }

            $locale  = in_array($user->locale ?? 'ru', ['ru', 'en'], true) ? $user->locale : 'ru';
            $target  = $job['target_name'];
            $link    = rtrim((string) getenv('app.siteUrl'), '/') . ($locale === 'en' ? '/en' : '') . '/observatory/jobs/' . rawurlencode((string) $job['id']);
            $subject = lang("Telescope.email{$kind}Subject", [$target], $locale);

            $message = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#1b1f27;">'
                . '<h2 style="margin:0 0 12px;">' . esc(lang("Telescope.email{$kind}Title", [], $locale)) . '</h2>'
                . '<p style="margin:0 0 12px;line-height:1.5;">' . esc(lang("Telescope.email{$kind}Intro", [$target], $locale)) . '</p>'
                . ($reason ? '<p style="margin:0 0 12px;line-height:1.5;">' . esc(lang('Telescope.emailReason', [$reason], $locale)) . '</p>' : '')
                . '<p style="margin:0;"><a href="' . esc($link, 'attr') . '">' . esc(lang('Telescope.emailLink', [], $locale)) . '</a></p>'
                . '</div>';

            (new EmailQueueModel())->enqueue($user->email, $subject, $message);
        } catch (\Throwable $e) {
            log_message('error', 'Telescope job e-mail ({kind}) for {job} failed: {msg}', ['kind' => $kind, 'job' => $job['id'] ?? '?', 'msg' => $e->getMessage()]);
        }
    }
}
