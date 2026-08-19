<?php

namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;

/**
 * Base class for all API controllers. Replaces the ad-hoc use of
 * ResponseTrait::fail()/failValidationErrors()/failNotFound()/etc — which
 * produced an inconsistent {status, error, messages} envelope with mixed
 * semantics inside `messages` — with a single, explicit error contract:
 *
 *   { "message": "text for the UI's generic error display" }
 *   { "message": "...", "errors": { "field": "per-field message", ... } }
 *
 * `message` is always present. `errors` is present only when the failure is
 * tied to specific form fields (validation). The HTTP status code alone
 * carries the error's semantic type — the body never repeats it:
 *   400 — malformed/invalid input (including field validation)
 *   401 — not authenticated
 *   403 — authenticated but not permitted
 *   404 — resource not found
 *   409 — conflict (already exists, already booked, duplicate, ...)
 *   500 — unexpected/server-side failure
 *
 * Any exception that escapes a controller entirely is still normalized to
 * this same shape by App\Libraries\ApiExceptionHandler (see
 * Config\Exceptions::handler()), so the contract holds even for bugs the
 * controller itself never catches.
 */
abstract class BaseApiController extends ResourceController
{
    /**
     * A generic error with only a message — no field-level errors.
     * Use the more specific respondNotFound()/respondUnauthorized()/
     * respondForbidden()/respondConflict()/respondServerError() helpers
     * below when the situation matches one of them.
     */
    protected function respondError(string $message, int $status = 400): ResponseInterface
    {
        return $this->respond(['message' => $message], $status);
    }

    /**
     * Field-level validation errors, e.g. from Validation::getErrors()
     * (a plain `array<string fieldName, string message>`) or a hand-built
     * one-field map for a business rule tied to a specific input
     * (e.g. "this name is already taken").
     *
     * $status defaults to 400 (invalid input) but can be overridden — e.g.
     * 409 when the field-level failure is really a conflict, not malformed
     * input.
     */
    protected function respondValidationErrors(array $errors, ?string $message = null, int $status = 400): ResponseInterface
    {
        return $this->respond([
            'message' => $message ?? lang('App.validationFailed'),
            'errors'  => $errors,
        ], $status);
    }

    protected function respondNotFound(?string $message = null): ResponseInterface
    {
        return $this->respondError($message ?? lang('App.notFound'), 404);
    }

    protected function respondUnauthorized(?string $message = null): ResponseInterface
    {
        return $this->respondError($message ?? lang('App.accessDenied'), 401);
    }

    protected function respondForbidden(?string $message = null): ResponseInterface
    {
        return $this->respondError($message ?? lang('App.accessDenied'), 403);
    }

    /**
     * A conflict with existing state — already exists, already booked,
     * duplicate submission, etc. Not tied to a specific form field; use
     * respondValidationErrors() with a $status of 409 for that case instead.
     */
    protected function respondConflict(string $message): ResponseInterface
    {
        return $this->respondError($message, 409);
    }

    protected function respondServerError(?string $message = null): ResponseInterface
    {
        return $this->respondError($message ?? lang('General.serverError'), 500);
    }

    /**
     * A malformed/incomplete request that a normal UI flow never produces —
     * a missing or invalid query/body parameter reachable only via a direct
     * API call or a frontend bug, not by anything a real user did through
     * the intended interface. Two problems with translating and showing
     * such a message to the client verbatim: it's meaningless to a user who
     * never typed anything the request/query-param name refers to, and it
     * leaks the API's internal parameter/field names — information an
     * attacker probing the API has no legitimate need for.
     *
     * Logs $logReason (for debugging/monitoring) and always returns the
     * same generic, translated message to the client instead.
     *
     * Do NOT use this for anything a user can actually trigger through the
     * UI — real form validation and business-rule conflicts still belong in
     * respondValidationErrors()/respondConflict()/etc. with a message that
     * actually helps the user fix their input.
     */
    protected function respondInvalidRequest(string $logReason): ResponseInterface
    {
        log_message('warning', '[' . static::class . '] ' . $logReason);

        return $this->respondError(lang('App.invalidRequest'), 400);
    }
}
