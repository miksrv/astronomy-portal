<?php

namespace Tests\Support\Database;

use App\Database\Migrations\AddTelescopeJobs;
use App\Database\Migrations\CreateObservatorySettingsTable;
use Config\Database;

/**
 * Creates the real tables of the telescope jobs (FEAT-30) on the in-memory SQLite test database
 * by running their own migrations — the whole migration history does not run on SQLite (MySQL
 * ENUMs), but these tables are plain on purpose, so the job logic is tested against a database.
 */
trait TelescopeTables
{
    protected function createTelescopeTables(): void
    {
        $db = Database::connect();

        foreach (['users', 'objects', 'observatory_night_plans', 'patrol_visits', 'patrol_targets', 'telescope_job_updates', 'telescope_jobs', 'observatory_settings'] as $table) {
            $db->query('DROP TABLE IF EXISTS "' . $table . '"');
        }

        $db->query('PRAGMA foreign_keys = ON');

        // Migration files are not PSR-4 named (date prefix), so they are loaded by path
        require_once APPPATH . 'Database/Migrations/2024-10-22-111100_AddObservatorySettings.php';
        require_once APPPATH . 'Database/Migrations/2026-11-05-100000_AddTelescopeJobs.php';

        $forge = Database::forge();
        (new CreateObservatorySettingsTable($forge))->up();
        (new AddTelescopeJobs($forge))->up();

        // The columns of `users` the job queries join (the real table has MySQL ENUMs)
        $db->query('CREATE TABLE users (id VARCHAR(15) PRIMARY KEY, name VARCHAR(100), email VARCHAR(100), avatar VARCHAR(40), locale VARCHAR(2) DEFAULT \'ru\', deleted_at DATETIME NULL)');
        // The columns of `objects` the patrol night's page looks up (the catalog link of a galaxy)
        $db->query('CREATE TABLE objects (catalog_name VARCHAR(40) PRIMARY KEY, deleted_at DATETIME NULL)');
    }
}
