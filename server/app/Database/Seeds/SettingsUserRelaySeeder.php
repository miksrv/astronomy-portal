<?php

namespace App\Database\Seeds;

use App\Models\SettingsModel;
use CodeIgniter\Database\Seeder;

class SettingsUserRelaySeeder extends Seeder
{
    public function run()
    {
        $settingsModel = new SettingsModel();

        $settingsModel->insert(['key' => 'last_time_light_turned_user']);
        $settingsModel->insert(['key' => 'light_turned_by_user', 'value' => '0']);
        $settingsModel->insert(['key' => 'light_turned_counter', 'value' => '0']);
    }
}
