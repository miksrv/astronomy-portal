<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Keeps the API's own responses (JSON, camera frames, tickets) out of search results:
 * crawlers find api.astro.miksoft.pro through the image links on the site and would
 * otherwise index raw JSON. Only what goes through index.php gets the header - the
 * photos and covers in public/ are static files served by the web server and stay
 * indexable for image search, which is also why robots.txt cannot simply disallow all.
 */
class NoIndexFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        $response->setHeader('X-Robots-Tag', 'noindex');

        return $response;
    }
}
