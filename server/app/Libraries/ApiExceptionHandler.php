<?php

namespace App\Libraries;

use CodeIgniter\Debug\ExceptionHandlerInterface;
use CodeIgniter\Exceptions\PageNotFoundException;
use CodeIgniter\HTTP\Exceptions\HTTPException;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

/**
 * Formats every exception that escapes a controller as the API's standard
 * error envelope ({"message": "..."}) instead of CodeIgniter's default
 * HTML error pages / debug-trace JSON dump. This is the fallback layer of
 * the error contract described in App\Controllers\BaseApiController — it
 * covers router 404s (PageNotFoundException) and any Throwable a
 * controller didn't catch itself (TypeError, Error, an uncaught business
 * Exception, ...).
 *
 * Registered for HTTP requests only, see Config\Exceptions::handler() —
 * CLI commands keep CodeIgniter's default handler since there is no JSON
 * consumer to satisfy there.
 *
 * Logging is already handled upstream by CodeIgniter\Debug\Exceptions
 * before this class is invoked (respecting Config\Exceptions::$log /
 * $ignoreCodes), so this class only needs to shape the response.
 */
final class ApiExceptionHandler implements ExceptionHandlerInterface
{
    public function handle(
        Throwable $exception,
        RequestInterface $request,
        ResponseInterface $response,
        int $statusCode,
        int $exitCode,
    ): void {
        if ($exception instanceof PageNotFoundException) {
            $statusCode = 404;
        }

        // Never leak internal exception messages/stack details for
        // unexpected (5xx) failures in production — only for the specific,
        // intentionally-thrown HTTP exceptions (4xx) is the message meant
        // for the client to begin with.
        $exposeMessage = $statusCode < 500 || ENVIRONMENT !== 'production' || $exception instanceof HTTPException;
        $message       = $exposeMessage ? $exception->getMessage() : '';

        if ($message === '') {
            $message = lang('General.serverError');
        }

        try {
            $response->setStatusCode($statusCode);
        } catch (HTTPException) {
            $statusCode = 500;
            $response->setStatusCode($statusCode);
        }

        $response->setJSON(['message' => $message])->send();

        if (ENVIRONMENT !== 'testing') {
            // @codeCoverageIgnoreStart
            exit($exitCode);
            // @codeCoverageIgnoreEnd
        }
    }
}
