<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Cache-Control for public, viewer-independent GET responses (the catalogue, the
 * photos, the categories, the sitemap...). Applied per route in Routes.php with the
 * lifetime in seconds as the argument: `['filter' => 'publiccache:300']`.
 *
 * Only a 200 to a request without an Authorization header gets the header: a
 * token may change what an endpoint returns, and an error must not be kept.
 * `stale-while-revalidate` lets a browser or a CDN show the previous answer
 * while it fetches a fresh one.
 */
class PublicCacheFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        $maxAge = (int) ($arguments[0] ?? 0);

        if (
            $maxAge <= 0
            || $request->getMethod() !== 'GET'
            || $response->getStatusCode() !== 200
            || $request->hasHeader('Authorization')
        ) {
            return null;
        }

        // The response starts with CI4's default `no-store, max-age=0, no-cache` as a
        // multi-value header, and setHeader() appends to such a header instead of
        // replacing it: without removing it first `no-store` would win and nothing
        // would ever be cached
        $response->removeHeader('Cache-Control');
        $response->setHeader('Cache-Control', sprintf('public, max-age=%d, stale-while-revalidate=%d', $maxAge, $maxAge * 4));

        // The body depends on the `Locale` header (LocaleLibrary), and a stored guest
        // answer must not be reused for a request that carries a token: without Vary a
        // browser would serve the Russian copy after a switch to English, or the guest
        // copy after a login
        $response->appendHeader('Vary', 'Locale');
        $response->appendHeader('Vary', 'Authorization');

        return $response;
    }
}
