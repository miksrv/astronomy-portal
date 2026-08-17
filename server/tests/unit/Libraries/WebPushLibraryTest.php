<?php

use App\Libraries\WebPushExpiredSubscriptionException;
use App\Libraries\WebPushLibrary;
use CodeIgniter\Test\CIUnitTestCase;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\VAPID;

/**
 * Pure unit tests for WebPushLibrary. No real network call is ever made:
 * the constructor test only exercises VAPID key validation, and the
 * status-code mapping test invokes the private assertReportSucceeded()
 * directly (via reflection) against a manually-built MessageSentReport,
 * mirroring how EmailLibraryTest reflects into attach() to avoid a real send.
 *
 * @internal
 */
final class WebPushLibraryTest extends CIUnitTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $keys = VAPID::createVapidKeys();

        putenv('push.vapidPublicKey=' . $keys['publicKey']);
        putenv('push.vapidPrivateKey=' . $keys['privateKey']);
        putenv('push.vapidSubject=mailto:no-reply@miksoft.pro');
    }

    protected function tearDown(): void
    {
        putenv('push.vapidPublicKey');
        putenv('push.vapidPrivateKey');
        putenv('push.vapidSubject');

        parent::tearDown();
    }

    private function invokeAssertReportSucceeded(WebPushLibrary $library, MessageSentReport $report): void
    {
        $reflection = new ReflectionMethod($library, 'assertReportSucceeded');
        $reflection->setAccessible(true);
        $reflection->invoke($library, $report);
    }

    // --- Constructor / VAPID validation ---

    public function testConstructorDoesNotThrowWithValidVapidConfig(): void
    {
        $library = new WebPushLibrary();
        $this->assertInstanceOf(WebPushLibrary::class, $library);
    }

    // --- Report -> exception mapping ---

    public function testSuccessfulReportDoesNotThrow(): void
    {
        $library = new WebPushLibrary();
        $request = new Request('POST', 'https://push.example.com/endpoint');
        $report  = new MessageSentReport($request, new Response(201), true, 'OK');

        $this->invokeAssertReportSucceeded($library, $report);

        // Reaching this line without an exception means success.
        $this->assertTrue(true);
    }

    public function testGoneStatusMapsToExpiredSubscriptionException(): void
    {
        $library = new WebPushLibrary();
        $request = new Request('POST', 'https://push.example.com/endpoint');
        $report  = new MessageSentReport($request, new Response(410), false, 'Gone');

        $this->expectException(WebPushExpiredSubscriptionException::class);
        $this->invokeAssertReportSucceeded($library, $report);
    }

    public function testNotFoundStatusMapsToExpiredSubscriptionException(): void
    {
        $library = new WebPushLibrary();
        $request = new Request('POST', 'https://push.example.com/endpoint');
        $report  = new MessageSentReport($request, new Response(404), false, 'Not Found');

        $this->expectException(WebPushExpiredSubscriptionException::class);
        $this->invokeAssertReportSucceeded($library, $report);
    }

    public function testOtherFailureStatusMapsToGenericException(): void
    {
        $library = new WebPushLibrary();
        $request = new Request('POST', 'https://push.example.com/endpoint');
        $report  = new MessageSentReport($request, new Response(500), false, 'Internal Server Error');

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Internal Server Error');
        $this->invokeAssertReportSucceeded($library, $report);
    }
}
