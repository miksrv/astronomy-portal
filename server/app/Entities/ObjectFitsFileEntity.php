<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class ObjectFitsFileEntity extends Entity
{
    protected $casts = [
        'id'             => 'string',
        'object_id'      => 'string',
        'file_name'      => 'string',
        'file_size'      => 'float',
        'ypixsz'         => 'float',
        'xpixsz'         => 'float',
        'naxis1'         => 'int',
        'naxis2'         => 'int',
        'naxis'          => 'int',
        'bscale'         => 'int',
        'simple'         => 'string',
        'bitpix'         => 'int',
        'xbinning'       => 'int',
        'ybinning'       => 'int',
        'exptime'        => 'int',
        'frame'          => 'string',
        'aptdia'         => 'int',
        'focallen'       => 'int',
        'comment'        => 'string',
        'telescop'       => 'string',
        'observer'       => 'string',
        'instrume'       => 'string',
        'pixsize1'       => 'float',
        'pixsize2'       => 'float',
        'ccd_temp'       => 'int',
        'offset'         => 'int',
        'gain'           => 'int',
        'scale'          => 'string',
        'date_obs'       => 'datetime',
        'equinox'        => 'string',
        'filter'         => 'string',
        'dec'            => 'float',
        'ra'             => 'float',
        'objctdec'       => 'string',
        'objctra'        => 'string',
        'sitelong'       => 'float',
        'sitelat'        => 'float',
        'bzero'          => 'int',
        'extend'         => 'string',
        'object'         => 'string',
        'airmass'        => 'float',
        'star_count'     => 'int',
        'sky_background' => 'float',
        'devitation'     => 'float',
        'sigma'          => 'float',
        'hfr'            => 'float',
        'fwhm'           => 'float',
        'created_at'     => 'datetime',
        'updated_at'     => 'datetime',
        'deleted_at'     => 'datetime'
    ];

    protected $datamap = [
        'fileName' => 'file_name',
        'exposure' => 'exptime',
        'ccdTemp'  => 'ccd_temp',
        'date'     => 'date_obs'
    ];
}
