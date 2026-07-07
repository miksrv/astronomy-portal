<?php

namespace App\Filters;

use App\Libraries\LocaleLibrary;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * Per-IP request throttling for public endpoints prone to abuse (flooding).
 *
 * Route usage: ['filter' => 'ratelimit:<bucket>,<capacity>,<seconds>']
 * e.g. 'ratelimit:comments,10,60' allows 10 requests per 60 seconds per IP.
 */
class RateLimitFilter implements FilterInterface
{
    /**
     * @param list<string>|null $arguments
     */
    public function before(RequestInterface $request, $arguments = null)
    {
        // Disabled during PHPUnit runs: the file cache is shared across test
        // cases, so a throttled bucket from one test would fail unrelated ones.
        if (ENVIRONMENT === 'testing') {
            return null;
        }

        if (!is_array($arguments) || count($arguments) < 3) {
            log_message('error', '[RateLimitFilter] Missing bucket/capacity/seconds arguments');

            return null;
        }

        [$bucket, $capacity, $seconds] = $arguments;

        // IPv6 addresses contain ':', which the cache backend rejects as a key
        // character, so the IP is hashed rather than used verbatim.
        $key       = $bucket . '_' . md5($request->getIPAddress());
        $throttler = Services::throttler();

        if ($throttler->check($key, (int) $capacity, (int) $seconds)) {
            return null;
        }

        LocaleLibrary::init();

        return Services::response()
            ->setJSON([
                'status'   => 429,
                'error'    => 429,
                'messages' => ['error' => lang('App.tooManyRequests')],
            ])
            ->setStatusCode(429);
    }

    /**
     * @param list<string>|null $arguments
     */
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return null;
    }
}
