<?php

namespace App\Libraries;

use Exception;

class EmailLibrary
{
    public \CodeIgniter\Email\Email $email;
    private array $config;

    public function __construct()
    {
        $this->config = [
            'protocol'    => 'smtp',
            'SMTPHost'    => getenv('smtp.host'),
            'SMTPUser'    => getenv('smtp.user'),
            'SMTPPass'    => getenv('smtp.pass'),
            'SMTPPort'    => (int) getenv('smtp.port'),
            // A synchronous send blocking the login-request endpoint must not
            // let a hung mail server stall that request indefinitely.
            'SMTPTimeout' => 5,
            'mailType'    => 'html',
            'SMTPCrypto'  => 'ssl',
            'charset'     => 'UTF-8',
            'wordWrap'    => false,
            'validate'    => false,
            'CRLF'        => "\r\n",
            'newline'     => "\r\n",
        ];

        $this->email = \Config\Services::email();
        $this->email->initialize($this->config);
    }

    private function getSenderName(): string
    {
        return getenv('smtp.senderName') ?: 'Astro Observatory';
    }

    /**
     * Writes email send failures to a dedicated `email-*.log` file instead of
     * the shared application log — SMTP debug dumps are verbose and would
     * otherwise drown out unrelated errors in `log-*.log`.
     */
    public static function logError(string $message): void
    {
        $logPath = WRITEPATH . 'logs/email-' . date('Y-m-d') . '.log';
        $entry   = 'ERROR - ' . date('Y-m-d H:i:s') . ' --> ' . $message . PHP_EOL . PHP_EOL;

        file_put_contents($logPath, $entry, FILE_APPEND | LOCK_EX);
    }

    /**
     * Send a plain HTML email (no attachment).
     *
     * @throws Exception
     */
    public function send(string $mailTo, string $subject, string $message): void
    {
        // Clear previous email state (important for sequential sends)
        $this->email->clear(true);
        $this->email->initialize($this->config);

        $this->email->setFrom(getenv('smtp.mail'), $this->getSenderName());
        $this->email->setTo($mailTo);
        $this->email->setSubject($subject);
        $this->email->setMessage($message);

        if (!$this->email->send()) {
            $debugInfo = $this->email->printDebugger(['headers', 'subject', 'body']);
            self::logError('Email send failed: ' . $debugInfo);
            throw new Exception('Failed to send email: ' . $debugInfo);
        }
    }

    /**
     * Send an HTML email with an optional inline image attachment and an
     * optional plain (non-cid) file attachment — e.g. an .ics calendar file
     * alongside the ticket image.
     *
     * The image is embedded as a CID and replaces the placeholder "cid:COVER_IMAGE_CID"
     * in the message body. The plain attachment is just attached normally,
     * with its own filename, and is not referenced from the body.
     *
     * @throws Exception
     */
    public function sendWithAttachment(
        string $mailTo,
        string $subject,
        string $message,
        ?string $attachmentPath = null,
        ?string $plainAttachmentPath = null,
        string $plainAttachmentName = 'attachment'
    ): void {
        // Clear previous email state (important for sequential sends)
        $this->email->clear(true);
        $this->email->initialize($this->config);

        $this->email->setFrom(getenv('smtp.mail'), $this->getSenderName());
        $this->email->setTo($mailTo);
        $this->email->setSubject($subject);

        // Handle attachment and replace placeholder CID
        if ($attachmentPath !== null) {
            $this->email->attach($attachmentPath);
            $cid     = $this->email->setAttachmentCID($attachmentPath);
            $message = str_replace('cid:COVER_IMAGE_CID', 'cid:' . $cid, $message);
        }

        if ($plainAttachmentPath !== null) {
            // No explicit $mime here — CI4's attach() only reads the file
            // from disk when $mime is omitted; passing one switches it into
            // "buffer" mode, which would base64-encode $plainAttachmentPath
            // itself (the path string) instead of the file's contents. CI4
            // auto-detects the mime type from the extension anyway
            // (.ics -> text/calendar, per Config\Mimes).
            $this->email->attach($plainAttachmentPath, 'attachment', $plainAttachmentName);
        }

        $this->email->setMessage($message);

        if (!$this->email->send()) {
            $debugInfo = $this->email->printDebugger(['headers', 'subject', 'body']);
            self::logError('Email send failed: ' . $debugInfo);
            throw new Exception('Failed to send email: ' . $debugInfo);
        }
    }
}
