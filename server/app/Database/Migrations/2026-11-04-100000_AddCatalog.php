<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The deep-sky reference catalog (OpenNGC: NGC + IC + addendum), imported by `php spark
 * catalog:import`. `catalog` holds one row per real object; `catalog_aliases` maps every
 * normalised designation of it (`M31`, `NGC224`, `PGC2557`, the names of duplicate entries) to
 * that row, so any name a FITS header, an editor or a visitor uses resolves to one object.
 * `objects.catalog_id` links our curated objects to their catalog row.
 */
class AddCatalog extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            // OpenNGC name as published (`NGC0224`, `IC0434`, `Mel022`)
            'name' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
            ],
            // Normalised (`NGC224`), see CatalogLibrary::normalize()
            'designation' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
            ],
            'type' => [
                'type'       => 'VARCHAR',
                'constraint' => 10,
            ],
            // J2000, degrees
            'ra' => [
                'type' => 'DOUBLE',
            ],
            'dec' => [
                'type' => 'DOUBLE',
            ],
            'constellation' => [
                'type'       => 'VARCHAR',
                'constraint' => 3,
                'null'       => true,
            ],
            // Arcminutes
            'maj_axis' => [
                'type' => 'FLOAT',
                'null' => true,
            ],
            'min_axis' => [
                'type' => 'FLOAT',
                'null' => true,
            ],
            'pos_angle' => [
                'type'       => 'SMALLINT',
                'constraint' => 3,
                'null'       => true,
            ],
            'mag_b' => [
                'type' => 'FLOAT',
                'null' => true,
            ],
            'mag_v' => [
                'type' => 'FLOAT',
                'null' => true,
            ],
            // mag/arcsec²
            'surf_brightness' => [
                'type' => 'FLOAT',
                'null' => true,
            ],
            'hubble' => [
                'type'       => 'VARCHAR',
                'constraint' => 10,
                'null'       => true,
            ],
            'messier' => [
                'type'       => 'SMALLINT',
                'constraint' => 3,
                'null'       => true,
            ],
            'common_names' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
            ],
            'name_ru' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
            ],
            'identifiers' => [
                'type' => 'TEXT',
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
        $this->forge->addUniqueKey('name', 'catalog_name');
        $this->forge->addUniqueKey('designation', 'catalog_designation');
        $this->forge->addKey('messier', false, false, 'catalog_messier');
        $this->forge->addKey(['ra', 'dec'], false, false, 'catalog_ra_dec');
        $this->forge->createTable('catalog', true);

        $this->forge->addField([
            // Normalised designation, see CatalogLibrary::normalize()
            'alias' => [
                'type'       => 'VARCHAR',
                'constraint' => 40,
            ],
            'catalog_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
        ]);
        $this->forge->addPrimaryKey('alias');
        $this->forge->addKey('catalog_id', false, false, 'catalog_aliases_catalog');
        $this->forge->createTable('catalog_aliases', true);

        $this->forge->addColumn('objects', [
            'catalog_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'magnitude',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('objects', 'catalog_id');
        $this->forge->dropTable('catalog_aliases', true);
        $this->forge->dropTable('catalog', true);
    }
}
