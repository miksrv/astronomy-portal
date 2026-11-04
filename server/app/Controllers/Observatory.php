<?php

namespace App\Controllers;

use App\Models\ObservatoryStatusModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Observatory as ObservatoryConfig;
use Throwable;

/**
 * Live observatory status (FEAT-30, phase 1). The observatory agent pushes a snapshot about
 * once a minute (`POST /observatory/agent/status`, token-protected by `observatoryagent`);
 * the site reads the latest one (`GET /observatory/status`) and the recent events.
 */
class Observatory extends BaseApiController
{
    /**
     * `POST /observatory/agent/status` — body: the snapshot JSON, with an optional `events` list.
     */
    public function agentStatus(): ResponseInterface
    {
        $body = $this->request->getBody() ?? '';

        if (strlen($body) > ObservatoryConfig::MAX_SNAPSHOT_BYTES) {
            return $this->respondError('Snapshot too large', 413);
        }

        $data = json_decode($body, true);

        if (!is_array($data) || array_is_list($data)) {
            return $this->respondInvalidRequest('observatory agent: body is not a JSON object');
        }

        $events = is_array($data['events'] ?? null) ? $data['events'] : [];
        unset($data['events']);

        try {
            (new ObservatoryStatusModel())->store($data, $events);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }

        return $this->respond(['received' => true]);
    }

    /**
     * `GET /observatory/status` — public view of the latest snapshot.
     */
    public function status(): ResponseInterface
    {
        try {
            return $this->respond((new ObservatoryStatusModel())->publicView());
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * `GET /observatory/events?limit=20` — recent public events, newest first.
     */
    public function events(): ResponseInterface
    {
        try {
            $limit = (int) ($this->request->getGet('limit') ?? 20);

            return $this->respond(['items' => (new ObservatoryStatusModel())->recentEvents($limit)]);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }
}
