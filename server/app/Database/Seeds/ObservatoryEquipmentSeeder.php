<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class ObservatoryEquipmentSeeder extends Seeder
{
    public function run()
    {
        $data = [
            // Mounts
            [
                'equipment_type' => 'mount',
                'brand'          => 'Sky-Watcher',
                'model'          => 'HEQ5 Pro',
                'specifications' => 'Popular GoTo mount for astrophotography with precise tracking.',
            ],
            [
                'equipment_type' => 'mount',
                'brand'          => 'Sky-Watcher',
                'model'          => 'EQ6',
                'specifications' => 'Heavy-duty equatorial mount designed for large telescopes.',
            ],
            [
                'equipment_type' => 'mount',
                'brand'          => 'Sky-Watcher',
                'model'          => 'Dobson SynScan',
                'specifications' => 'Dobsonian GoTo mount for large aperture telescopes.',
            ],

            // Telescopes
            [
                'equipment_type' => 'scope',
                'brand'          => 'Sky-Watcher',
                'model'          => 'Dob 10" 250/1200 Retractable',
                'specifications' => 'Aperture: 250 mm, Focal length: 1200 mm, Dobsonian design.',
            ],
            [
                'equipment_type' => 'scope',
                'brand'          => 'Sky-Watcher',
                'model'          => 'BK2001P',
                'specifications' => 'Aperture: 205 mm, Focal ratio: f/4, Suitable for astrophotography.',
            ],
            [
                'equipment_type' => 'scope',
                'brand'          => 'TAL',
                'model'          => '250',
                'specifications' => 'Aperture: 250 mm, Focal length: 2130 mm, Optical scheme: Klevtsov, Resolution: 0.5 arc sec, Max magnification: 400x.',
            ],

            // Cameras
            [
                'equipment_type' => 'camera',
                'brand'          => 'ASI',
                'model'          => 'ZWO 1600MM Pro',
                'specifications' => 'Monochrome camera, 16MP, designed for deep-sky imaging.',
            ],
            [
                'equipment_type' => 'camera',
                'brand'          => 'ASI',
                'model'          => 'ZWO 6200MM Pro',
                'specifications' => 'Full-frame 62MP monochrome camera for high-resolution astrophotography.',
            ],
            [
                'equipment_type' => 'camera',
                'brand'          => 'Canon',
                'model'          => '5D Mk3',
                'specifications' => 'Full-frame camera.',
            ],

            // Guiding Cameras
            [
                'equipment_type' => 'guiding_camera',
                'brand'          => 'ASI',
                'model'          => '120mm',
                'specifications' => 'Popular guide camera, 1.2 MP, sensitive to faint stars.',
            ],
            [
                'equipment_type' => 'guiding_camera',
                'brand'          => 'QHY',
                'model'          => 'QHY5',
                'specifications' => 'Basic guide camera for autoguiding during long exposures.',
            ],

            // Guiding Scopes
            [
                'equipment_type' => 'guiding_scope',
                'brand'          => 'Sky-Watcher',
                'model'          => '9x50 Finder',
                'specifications' => 'Used for guiding or finding objects during astrophotography.',
            ],
            [
                'equipment_type' => 'guiding_scope',
                'brand'          => 'SVBONY',
                'model'          => '60mm Guide Scope',
                'specifications' => 'Aperture: 60 mm, Focal length: 240 mm, Magnification: ~10x, Stars up to 11th magnitude.',
            ],

            // Focusers
            [
                'equipment_type' => 'focuser',
                'brand'          => 'ZWO',
                'model'          => 'EAF',
                'specifications' => 'Electronic automatic focuser for precise focusing.',
            ],

            // Filter Wheels
            [
                'equipment_type' => 'filter_wheel',
                'brand'          => 'ZWO',
                'model'          => 'EFW 8x31mm',
                'specifications' => 'Motorized filter wheel for 8x31mm filters.',
            ],
            [
                'equipment_type' => 'filter_wheel',
                'brand'          => 'ZWO',
                'model'          => 'EFW 7x2"',
                'specifications' => 'Motorized filter wheel for 7x2" filters, ideal for large format imaging.',
            ],

            // Filters
            [
                'equipment_type' => 'filter',
                'brand'          => 'ZWO',
                'model'          => 'L, R, G, B, Ha, OIII, SII (1.25")',
                'specifications' => 'Complete narrowband and broadband filter set for 1.25" size.',
            ],
            [
                'equipment_type' => 'filter',
                'brand'          => 'ZWO',
                'model'          => 'L, R, G, B, Ha, OIII, (SII 2")',
                'specifications' => 'Complete narrowband and broadband filter set for 2" size.',
            ],
        ];

        $this->db->table('observatory_equipment')->insertBatch($data);
    }
}
