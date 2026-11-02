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

        $response->setHeader('Cache-Control', sprintf('public, max-age=%d, stale-while-revalidate=%d', $maxAge, $maxAge * 4));

        return $response;
    }
}
