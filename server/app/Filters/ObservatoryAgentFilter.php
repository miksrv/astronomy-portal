<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Observatory;
use Config\Services;

/**
 * Lets only the observatory agent through: `Authorization: Bearer <observatory.agentToken>`,
 * compared in constant time. A server without a configured token (or with one shorter than
 * 32 characters) refuses every agent request.
 */
class ObservatoryAgentFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $expected = Observatory::agentToken();
        $header   = $request->getHeaderLine('Authorization');
        $given    = str_starts_with($header, 'Bearer ') ? substr($header, 7) : '';

        if (strlen($expected) >= 32 && $given !== '' && hash_equals($expected, $given)) {
            return null;
        }

        return Services::response()
            ->setJSON(['message' => 'Unauthorized'])
            ->setStatusCode(401);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return null;
    }
}
