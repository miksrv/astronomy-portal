<?php

use App\Libraries\EmailLibrary;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Regression test for a bug where the plain (non-cid) attachment — e.g. the
 * .ics calendar file — arrived corrupted: CI4's `Email::attach()` only reads
 * the file from disk when its `$mime` argument is omitted; passing a mime
 * switches it into "buffer" mode, where the `$file` argument itself is
 * treated as already-loaded raw content. `EmailLibrary::sendWithAttachment()`
 * used to pass an explicit mime type, so it base64-encoded the *file path
 * string* instead of the file's actual bytes.
 *
 * @internal
 */
final class EmailLibraryTest extends CIUnitTestCase
{
    private string $icsPath;
    private string $icsContent;

    protected function setUp(): void
    {
        parent::setUp();

        $this->icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR";
        $this->icsPath     = sys_get_temp_dir() . '/email_library_test_' . uniqid() . '.ics';
        file_put_contents($this->icsPath, $this->icsContent);
    }

    protected function tearDown(): void
    {
        if (is_file($this->icsPath)) {
            unlink($this->icsPath);
        }

        parent::tearDown();
    }

    /**
     * Reads the private/protected `attachments` array off the underlying CI4
     * Email instance without triggering a real SMTP send.
     */
    private function attachPlainFile(string $path, string $name): array
    {
        $library = new EmailLibrary();

        $reflection = new ReflectionMethod($library->email, 'attach');
        $reflection->setAccessible(true);
        // Mirrors EmailLibrary::sendWithAttachment()'s plain-attachment call
        // exactly — disposition 'attachment', a display name, no mime.
        $reflection->invoke($library->email, $path, 'attachment', $name);

        $attachmentsProperty = new ReflectionProperty($library->email, 'attachments');
        $attachmentsProperty->setAccessible(true);

        return $attachmentsProperty->getValue($library->email);
    }

    public function testAttachedFileContentMatchesTheSourceFileBytes(): void
    {
        $attachments = $this->attachPlainFile($this->icsPath, 'event.ics');

        $this->assertCount(1, $attachments);

        $decoded = base64_decode(str_replace(["\r", "\n"], '', $attachments[0]['content']), true);

        $this->assertSame($this->icsContent, $decoded);
    }

    public function testAttachedFileMimeTypeIsAutoDetectedFromExtension(): void
    {
        $attachments = $this->attachPlainFile($this->icsPath, 'event.ics');

        $this->assertSame('text/calendar', $attachments[0]['type']);
    }
}
