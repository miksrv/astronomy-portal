<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class PhotoAstrometryEntity extends Entity
{
    protected $casts = [
        'photo_id'      => 'string',
        'status'        => 'string',
        'error'         => '?string',
        'submission_id' => '?integer',
        'job_id'        => '?integer',
        'solved_width'  => '?integer',
        'solved_height' => '?integer',
        'ra'            => '?float',
        'dec'           => '?float',
        'radius'        => '?float',
        'pixscale'      => '?float',
        'orientation'   => '?float',
        'parity'        => '?integer',
        'wcs'           => '?json-array',
        'annotations'   => '?json-array',
        'solved_at'     => '?string',
        'created_at'    => '?string',
        'updated_at'    => '?string',
    ];

    protected $datamap = [
        'photoId'      => 'photo_id',
        'submissionId' => 'submission_id',
        'jobId'        => 'job_id',
        'solvedWidth'  => 'solved_width',
        'solvedHeight' => 'solved_height',
        'solvedAt'     => 'solved_at',
        'createdAt'    => 'created_at',
        'updatedAt'    => 'updated_at',
    ];
}
