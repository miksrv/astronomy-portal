<?php

namespace App\Models;

use CodeIgniter\I18n\Time;

/**
 * PatrolTargetsModel
 *
 * The supernova/nova patrol (FEAT-30 §4.10): galaxies (`patrol_targets`) re-imaged every few
 * nights. The visits the agent reports (`patrol_visits`) and the nightly patrol jobs are kept by
 * `App\Libraries\PatrolNights`, which also derives `last_visit_at` and `visits` from them.
 */
class PatrolTargetsModel extends ApplicationBaseModel
{
    protected $table          = 'patrol_targets';
    protected $primaryKey     = 'id';
    protected $returnType     = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields  = ['name', 'ra', 'dec', 'object_type', 'maj_axis', 'magnitude', 'enabled', 'cadence_days', 'last_visit_at', 'visits'];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';

    /**
     * The enabled targets in the agent's shape.
     */
    public function forAgent(): array
    {
        $rows = $this->where('enabled', 1)->orderBy('id', 'ASC')->findAll();

        return array_map(static fn (array $row) => [
            'id'          => (int) $row['id'],
            'name'        => $row['name'],
            'ra'          => (float) $row['ra'],
            'dec'         => (float) $row['dec'],
            'type'        => $row['object_type'],
            'majAxis'     => $row['maj_axis'] === null ? null : (float) $row['maj_axis'],
            'magnitude'   => $row['magnitude'] === null ? null : (float) $row['magnitude'],
            'cadenceDays' => $row['cadence_days'] === null ? null : (int) $row['cadence_days'],
            'lastVisitAt' => $row['last_visit_at'] ? Time::parse($row['last_visit_at'], 'UTC')->format('Y-m-d\TH:i:s\Z') : null,
            'visits'      => (int) $row['visits'],
        ], $rows);
    }
}
