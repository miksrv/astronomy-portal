<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Objects & observatory redesign (4.15.0):
 *  - `objects.distance` (light years) and `objects.magnitude` (apparent visual magnitude):
 *    optional catalog facts shown on the object page, filled in by an editor;
 *  - a composite (object, date_obs) index on `objects_fits_files` for per-object queries over a
 *    date range (the observing-log of one object). The night aggregates themselves group by
 *    an expression on `date_obs` and are served from the cache, not from this index.
 */
class ObjectsRedesign extends Migration
{
    public function up()
    {
        $this->forge->addColumn('objects', [
            'distance' => [
                'type'  => 'FLOAT',
                'null'  => true,
                'after' => 'dec',
            ],
            'magnitude' => [
                'type'  => 'FLOAT',
                'null'  => true,
                'after' => 'distance',
            ],
        ]);

        $this->forge->addKey(['object', 'date_obs'], false, false, 'object_date_obs');
        $this->forge->processIndexes('objects_fits_files');
    }

    public function down()
    {
        $this->forge->dropKey('objects_fits_files', 'object_date_obs', false);
        $this->forge->dropColumn('objects', ['distance', 'magnitude']);
    }
}
