<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class ObservatorySettingsSeeder extends Seeder
{
    public function run()
    {
        $data = [
            ['key' => 'last_time_light_turned_user', 'value' => null],
            ['key' => 'light_turned_by_user', 'value' => '0'],
            ['key' => 'light_turned_counter', 'value' => '0']
        ];

        $this->db->table('observatory_settings')->insertBatch($data);
    }
}
