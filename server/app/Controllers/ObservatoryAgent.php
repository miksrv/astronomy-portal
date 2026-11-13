<?php

namespace App\Controllers;

use App\Libraries\PatrolNights;
use App\Libraries\TelescopeAgentSync;
use App\Libraries\TelescopeMailer;
use App\Libraries\TelescopeSettings;
use App\Models\ObservatoryNightPlansModel;
use App\Models\PatrolTargetsModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\I18n\Time;
use Config\Telescope as TelescopeConfig;
use Throwable;

/**
 * The job sync with the observatory agent (FEAT-30 phase 2, `features/observatory-agent.md` §4.3).
 * Every route is behind `observatoryagent` (the agent token). The agent pulls the full desired
 * state and pushes its outbox in order; see `TelescopeAgentSync` for the rules.
 */
class ObservatoryAgent extends BaseApiController
{
    /** Largest body of an updates / visits batch, bytes */
    private const MAX_BATCH_BYTES = 1048576;

    /** Largest plan of a night, bytes */
    private const MAX_PLAN_BYTES = 262144;

    /**
     * `GET /observatory/agent/jobs` — the settings the agent needs and every job the observatory
     * should know about (approved, queued, running), after expiring the overdue ones.
     */
    public function jobs(): ResponseInterface
    {
        try {
            $sync     = new TelescopeAgentSync();
            $settings = TelescopeSettings::load();
            $expired  = $sync->expireOverdue();
            (new PatrolNights())->closeFinished();

            $mailer = new TelescopeMailer();
            foreach ($expired as $job) {
                $mailer->expired($job);
            }

            return $this->respond([
                'serverTime' => Time::now('UTC')->format('Y-m-d\TH:i:s\Z'),
                'settings'   => [
                    'autonomousMode' => $settings->autonomousMode,
                    'altitudeFloor'  => $settings->altitudeFloor,
                    'filters'        => $settings->filters,
                    'patrol'         => [
                        'enabled'     => $settings->patrolEnabled,
                        'minAltitude' => $settings->patrolMinAltitude,
                        'cadenceDays' => $settings->patrolCadenceDays,
                        'exposure'    => $settings->patrolExposure,
                        'count'       => $settings->patrolCount,
                        'binning'     => $settings->patrolBinning,
                    ],
                ],
                'jobs'       => $sync->desiredState(),
            ]);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * `POST /observatory/agent/updates` — body `{updates: [{jobId, seq, type, time, payload?}]}`,
     * the agent's outbox in order. Answer: a result per processed update; `stopped` when a gap
     * ended the batch (the agent resends from the `lastSeq` it got).
     */
    public function updates(): ResponseInterface
    {
        $body = $this->request->getBody() ?? '';

        if (strlen($body) > self::MAX_BATCH_BYTES) {
            return $this->respondError('Batch too large', 413);
        }

        $data = json_decode($body, true);

        if (!is_array($data) || !is_array($data['updates'] ?? null) || !array_is_list($data['updates'])) {
            return $this->respondInvalidRequest('observatory agent: updates is not a list');
        }

        if (count($data['updates']) > TelescopeAgentSync::MAX_BATCH) {
            return $this->respondError('Batch too large', 413);
        }

        $sync = new TelescopeAgentSync();

        try {
            return $this->respond($sync->applyUpdates($data['updates']));
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        } finally {
            // Every applied update is committed on its own: its e-mail goes out even when a later
            // one of the batch failed (the resent batch sees it as a duplicate and mails nothing)
            $mailer = new TelescopeMailer();

            foreach ($sync->notifications() as $notification) {
                $notification['kind'] === 'completed'
                    ? $mailer->completed($notification['job'])
                    : $mailer->firstFrames($notification['job']);
            }
        }
    }

    /**
     * `GET /observatory/agent/patrol` — the enabled patrol targets.
     */
    public function patrol(): ResponseInterface
    {
        try {
            return $this->respond(['targets' => (new PatrolTargetsModel())->forAgent()]);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * `POST /observatory/agent/patrol/visits` — body `{visits: [{target, time, frames, lastFrame?}]}`;
     * a visit is reported while it is being shot and once more when it is over (target + time is
     * its key, the larger count wins). The night's visits make its patrol job (`PatrolNights`).
     */
    public function visits(): ResponseInterface
    {
        $body = $this->request->getBody() ?? '';

        if (strlen($body) > self::MAX_BATCH_BYTES) {
            return $this->respondError('Batch too large', 413);
        }

        $data = json_decode($body, true);

        if (!is_array($data) || !is_array($data['visits'] ?? null) || !array_is_list($data['visits'])) {
            return $this->respondInvalidRequest('observatory agent: visits is not a list');
        }

        if (count($data['visits']) > PatrolNights::MAX_VISITS) {
            return $this->respondError('Batch too large', 413);
        }

        try {
            return $this->respond((new PatrolNights())->record($data['visits']));
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }

    /**
     * `POST /observatory/agent/plan` — body `{night: 'Y-m-d' (local date of the evening), plan: {...}}`,
     * tonight's plan as the agent built it; replaces the stored one for that night.
     */
    public function plan(): ResponseInterface
    {
        $body = $this->request->getBody() ?? '';

        if (strlen($body) > self::MAX_PLAN_BYTES) {
            return $this->respondError('Plan too large', 413);
        }

        $data  = json_decode($body, true);
        $night = is_array($data) && is_string($data['night'] ?? null) ? $data['night'] : '';

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $night) || !is_array($data['plan'] ?? null) || array_is_list($data['plan'])) {
            return $this->respondInvalidRequest('observatory agent: plan needs night (Y-m-d) and a plan object');
        }

        // Only around today: a wrong clock on the observatory PC must not fill the table with junk
        $today = Time::now(TelescopeConfig::TIME_ZONE);

        if ($night < $today->subDays(1)->format('Y-m-d') || $night > $today->addDays(1)->format('Y-m-d')) {
            return $this->respondInvalidRequest('observatory agent: plan night is not around today');
        }

        try {
            (new ObservatoryNightPlansModel())->store($night, $data['plan']);
            // The night's patrol job (if the patrol shot anything yet) follows the plan: planned targets, the dawn
            (new PatrolNights())->refreshNight($night);

            return $this->respond(['stored' => true]);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError();
        }
    }
}
