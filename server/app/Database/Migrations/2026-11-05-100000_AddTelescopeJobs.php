<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Telescope jobs and the supernova patrol (FEAT-30 phase 2, `features/observatory-agent.md` §4, §6).
 *
 * - `telescope_jobs` — what users asked the observatory to shoot. The portal owns the target, the
 *   plan, the constraints, the priority and the approval (`version` is bumped on every change of
 *   those, so the agent re-reads the job); the agent owns `progress`, `last_seq` and the execution
 *   statuses. `status` is a VARCHAR, not an ENUM, so the migration also runs on SQLite (tests).
 * - `telescope_job_updates` — every state update the agent sent, unique per (`job_id`, `seq`):
 *   the idempotency log (a repeated `seq` is ignored) and the job's night-by-night timeline.
 * - Frames are not stored here: they live in observatory-api (the archive). A job keeps only the
 *   captured counts per filter (`progress`) and the time window of its frames (`first_frame_at`,
 *   `last_frame_at`), which is how the site asks observatory-api for the frames' details.
 * - `patrol_targets` / `patrol_visits` — the patrol galaxies and every visit the agent reported
 *   (unique per target + time, so a repeated report is not counted twice). A night's visits make
 *   one job of its own (`source` = patrol, `night`), so the patrol shows in the queue like any job.
 * - `observatory_night_plans` — tonight's plan as the agent built it, one row per night.
 * - New `observatory_settings` keys (limits, the altitude floor, the autonomous-mode switch — off).
 */
class AddTelescopeJobs extends Migration
{
    /** Settings added by this migration, with their defaults (values are strings, ≤ 200 chars) */
    public const SETTINGS = [
        // Phase 3: the agent may start the Ekos Scheduler by itself. Off until the on-site checklist passed
        'autonomous_mode'           => '0',
        // Nothing is ever planned below this altitude, degrees (§4.11)
        'altitude_floor'            => '15',
        'job_default_min_altitude'  => '30',
        'job_max_exposure_hours'    => '2',
        'job_max_active'            => '3',
        'job_exposure_min'          => '30',
        'job_exposure_max'          => '600',
        'job_max_frames_per_filter' => '100',
        // Filter wheel slot names, in slot order (Ekos uses these names)
        'filters'                   => 'L,R,G,B,H,O,S',
        'patrol_enabled'            => '1',
        'patrol_min_altitude'       => '25',
        'patrol_cadence_days'       => '6',
        'patrol_exposure'           => '60',
        'patrol_count'              => '5',
        'patrol_binning'            => '2',
    ];

    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
            // Who made the job: `site` — a visitor on the site (user_id is the author); `patrol` —
            // the observatory agent itself, the supernova patrol (no author)
            'source' => [
                'type'       => 'VARCHAR',
                'constraint' => 16,
                'null'       => false,
                'default'    => 'site',
            ],
            'user_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
            ],
            // What the author called the target (e.g. "M 101")
            'target_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 60,
                'null'       => false,
            ],
            // Our object (`objects.catalog_name`) when the target was picked from the catalog
            'object' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
            ],
            // J2000, degrees; null only for a patrol night (its targets are its visits)
            'ra' => [
                'type'       => 'DECIMAL',
                'constraint' => '8,5',
                'null'       => true,
            ],
            'dec' => [
                'type'       => 'DECIMAL',
                'constraint' => '8,5',
                'null'       => true,
            ],
            // simple (a preset) | pro (own rows)
            'mode' => [
                'type'       => 'VARCHAR',
                'constraint' => 10,
                'null'       => false,
                'default'    => 'simple',
            ],
            'preset' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'null'       => true,
            ],
            // JSON: [{filter, exposure, count}] — filter is a wheel slot name
            'plan' => [
                'type' => 'TEXT',
                'null' => false,
            ],
            // Degrees; never below the altitude floor
            'min_altitude' => [
                'type'       => 'DECIMAL',
                'constraint' => '4,1',
                'null'       => false,
                'default'    => 30,
            ],
            // Degrees; null = the planner's default for the filter group
            'min_moon_separation' => [
                'type'       => 'SMALLINT',
                'constraint' => 3,
                'unsigned'   => true,
                'null'       => true,
            ],
            'valid_until' => [
                'type' => 'DATE',
                'null' => true,
            ],
            // A patrol night (`source` = patrol): the local date of its evening — one job per night,
            // made by the first visit the agent reports — the visits so far and the targets planned
            'night' => [
                'type' => 'DATE',
                'null' => true,
            ],
            'visits_done' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'unsigned'   => true,
                'null'       => true,
            ],
            'visits_planned' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'unsigned'   => true,
                'null'       => true,
            ],
            // Admin override: added to the planner's score; `pinned` puts the job first, `held` keeps it off the schedule
            'priority' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => false,
                'default'    => 0,
            ],
            'pinned' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => false,
                'default'    => 0,
            ],
            'held' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => false,
                'default'    => 0,
            ],
            // pending | approved | rejected | queued | running | completed | cancelled | expired | failed
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'null'       => false,
                'default'    => 'pending',
            ],
            // Rejection / failure reason, shown to the author
            'status_reason' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
            ],
            // The author cancelled a job the observatory already has; the agent removes it at a safe point
            'cancel_requested_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            // Bumped on every change of a portal-owned field
            'version' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => false,
                'default'    => 1,
            ],
            // JSON: {filter: captured frames}, as the agent reports it (absolute counts); owned by the agent
            'progress' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            // The last applied agent update
            'last_seq' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => false,
                'default'    => 0,
            ],
            'reviewed_by' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
            ],
            'reviewed_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'accepted_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'started_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            // The window of the job's frames (UTC): what the site asks observatory-api for
            'first_frame_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'last_frame_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'finished_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('status', false, false, 'telescope_jobs_status');
        $this->forge->addKey(['user_id', 'status'], false, false, 'telescope_jobs_user_status');
        $this->forge->addUniqueKey('night', 'telescope_jobs_night');
        $this->forge->createTable('telescope_jobs', true);

        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'job_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
            'seq' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => false,
            ],
            // accepted | started | progress | night_ended | completed | failed | cancelled
            'type' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'null'       => false,
            ],
            // 0 = the seq was consumed but the transition didn't fit the job's status (logged, not applied)
            'applied' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => false,
                'default'    => 1,
            ],
            // JSON, as the agent sent it
            'payload' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            // When it happened at the observatory (UTC)
            'time' => [
                'type' => 'DATETIME',
                'null' => false,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey(['job_id', 'seq'], 'telescope_job_updates_seq');
        $this->forge->addForeignKey('job_id', 'telescope_jobs', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('telescope_job_updates', true);

        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            // Also the Ekos target name and the frames folder (M 31 needs several fields: "M 31 field 1")
            'name' => [
                'type'       => 'VARCHAR',
                'constraint' => 60,
                'null'       => false,
            ],
            // J2000, degrees
            'ra' => [
                'type'       => 'DECIMAL',
                'constraint' => '8,5',
                'null'       => false,
            ],
            'dec' => [
                'type'       => 'DECIMAL',
                'constraint' => '8,5',
                'null'       => false,
            ],
            // SIMBAD short type code
            'object_type' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'null'       => true,
            ],
            // Arcmin
            'maj_axis' => [
                'type'       => 'DECIMAL',
                'constraint' => '6,2',
                'null'       => true,
            ],
            'magnitude' => [
                'type'       => 'DECIMAL',
                'constraint' => '4,2',
                'null'       => true,
            ],
            'enabled' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => false,
                'default'    => 1,
            ],
            // null = the `patrol_cadence_days` setting
            'cadence_days' => [
                'type'       => 'TINYINT',
                'constraint' => 3,
                'unsigned'   => true,
                'null'       => true,
            ],
            'last_visit_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'visits' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => false,
                'default'    => 0,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey('name', 'patrol_targets_name');
        $this->forge->createTable('patrol_targets', true);

        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'target_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => false,
            ],
            // The patrol night job the visit belongs to
            'job_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
            ],
            // When the visit started at the observatory (UTC) — with the target, the visit's key
            'time' => [
                'type' => 'DATETIME',
                'null' => false,
            ],
            // Its latest frame so far (UTC): a visit is reported while it is still being shot
            'last_frame' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'frames' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'unsigned'   => true,
                'null'       => false,
                'default'    => 0,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey(['target_id', 'time'], 'patrol_visits_target_time');
        $this->forge->addKey('job_id', false, false, 'patrol_visits_job');
        $this->forge->addForeignKey('target_id', 'patrol_targets', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('job_id', 'telescope_jobs', 'id', 'CASCADE', 'SET NULL');
        $this->forge->createTable('patrol_visits', true);

        $this->forge->addField([
            // The local date of the evening the night starts
            'night' => [
                'type' => 'DATE',
                'null' => false,
            ],
            // JSON, as the agent built it
            'plan' => [
                'type' => 'MEDIUMTEXT',
                'null' => false,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addPrimaryKey('night');
        $this->forge->createTable('observatory_night_plans', true);

        // Only keys that are not there yet: a re-run never overwrites a value an admin changed
        $existing = array_column(
            $this->db->table('observatory_settings')->select('key')->whereIn('key', array_keys(self::SETTINGS))->get()->getResultArray(),
            'key',
        );
        $rows = [];

        foreach (self::SETTINGS as $key => $value) {
            if (!in_array($key, $existing, true)) {
                $rows[] = ['key' => $key, 'value' => $value];
            }
        }

        if ($rows) {
            $this->db->table('observatory_settings')->insertBatch($rows);
        }
    }

    public function down()
    {
        $this->db->table('observatory_settings')->whereIn('key', array_keys(self::SETTINGS))->delete();

        $this->forge->dropTable('observatory_night_plans', true);
        $this->forge->dropTable('patrol_visits', true);
        $this->forge->dropTable('patrol_targets', true);
        $this->forge->dropTable('telescope_job_updates', true);
        $this->forge->dropTable('telescope_jobs', true);
    }
}
