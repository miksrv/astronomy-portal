<?php

use App\Filters\PublicCacheFilter;
use CodeIgniter\Test\CIUnitTestCase;
use Config\Services;

/**
 * @internal
 */
final class PublicCacheFilterTest extends CIUnitTestCase
{
    private function applyFilter(string $method, int $status = 200, array $headers = []): \CodeIgniter\HTTP\ResponseInterface
    {
        $request = Services::incomingrequest(null, false)->withMethod($method);

        foreach ($headers as $name => $value) {
            $request->setHeader($name, $value);
        }

        $response = Services::response(null, false)->setStatusCode($status);

        (new PublicCacheFilter())->after($request, $response, ['300']);

        return $response;
    }

    public function testPublicGetGetsCacheControlAndVary(): void
    {
        $response = $this->applyFilter('GET');

        $this->assertSame('public, max-age=300, stale-while-revalidate=1200', $response->getHeaderLine('Cache-Control'));
        $this->assertStringContainsString('Locale', $response->getHeaderLine('Vary'));
        $this->assertStringContainsString('Authorization', $response->getHeaderLine('Vary'));
    }

    public function testRequestWithTokenIsNotMadePublic(): void
    {
        $response = $this->applyFilter('GET', 200, ['Authorization' => 'token']);

        $this->assertStringNotContainsString('public', $response->getHeaderLine('Cache-Control'));
    }

    public function testErrorIsNotMadePublic(): void
    {
        $response = $this->applyFilter('GET', 404);

        $this->assertStringNotContainsString('public', $response->getHeaderLine('Cache-Control'));
    }
}
