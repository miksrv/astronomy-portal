<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddPhotosViews extends Migration
{
    public function up()
    {
        $this->forge->addColumn('photos', [
            'views' => [
                'type'     => 'INT',
                'unsigned' => true,
                'null'     => false,
                'default'  => 0,
                'after'    => 'image_height',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('photos', 'views');
    }
}
