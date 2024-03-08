<?php namespace App\Entities;

use CodeIgniter\Entity\Entity;

class File extends Entity {
    protected $attributes = [];

    protected $casts = [
        'exptime'  => 'integer',
        'ccd_temp' => 'integer',
        'offset'   => 'integer',
        'gain'     => 'integer',
        'dec'      => 'float',
        'ra'       => 'float',
        'star_count'     => '?integer',
        'sky_background' => '?integer',
        'hfr'            => '?integer',
    ];
}
