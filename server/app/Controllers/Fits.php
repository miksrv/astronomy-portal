<?php namespace App\Controllers;

use App\Models\FilesModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use ReflectionException;
use Exception;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, PATCH, PUT');
header('Access-Control-Allow-Headers: X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization');

if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
    die();
}

class Fits extends ResourceController
{
    use ResponseTrait;

    /**
     * @return ResponseInterface
     * @throws ReflectionException
     */
    public function data(): ResponseInterface {
        $input = $this->request->getJSON(true);

        $fileName   = md5($input['FILE_NAME']);
        $filesModel = new FilesModel();

        if ($filesModel->find($fileName)) {
            return $this->failResourceExists($input['FILE_NAME']);
        }

        if (!isset($input['DEC']) || !isset($input['RA'])) {
            return $this->fail('No RA or DEC coordinates');
        }

        try {
            $insert = [
                'id'        => md5($input['FILE_NAME']),
                'file_name' => $input['FILE_NAME'],
                'ypixsz'    => isset($input['YPIXSZ']) ? floatval($input['YPIXSZ']) : null,
                'xpixsz'    => isset($input['XPIXSZ']) ? floatval($input['XPIXSZ']) : null,
                'naxis1'    => isset($input['NAXIS1']) ? intval($input['NAXIS1']) : null,
                'naxis2'    => isset($input['NAXIS2']) ? intval($input['NAXIS2']) : null,
                'naxis'     => isset($input['NAXIS']) ? intval($input['NAXIS']) : null,
                'bscale'    => isset($input['BSCALE']) ? intval($input['BSCALE']) : 0,
                'simple'    => isset($input['SIMPLE']) ? intval($input['SIMPLE']) : null,
                'bitpix'    => isset($input['BITPIX']) ? intval($input['BITPIX']) : null,
                'xbinning'  => isset($input['XBINNING']) ? intval($input['XBINNING']) : null,
                'ybinning'  => isset($input['YBINNING']) ? intval($input['YBINNING']) : null,
                'exptime'   => isset($input['EXPTIME']) ? intval($input['EXPTIME']) : null,
                'frame'     => $input['FRAME'] ?? null,
                'aptdia'    => isset($input['APTDIA']) ? intval($input['APTDIA']) : null,
                'focallen'  => isset($input['FOCALLEN']) ? intval($input['FOCALLEN']) : null,
                'comment'   => $input['COMMENT'] ?? null,
                'telescop'  => $input['TELESCOP'] ?? null,
                'observer'  => $input['OBSERVER'] ?? null,
                'instrume'  => $input['INSTRUME'] ?? null,
                'pixsize1'  => isset($input['PIXSIZE1']) ? floatval($input['PIXSIZE1']) : null,
                'pixsize2'  => isset($input['PIXSIZE2']) ? floatval($input['PIXSIZE2']) : null,
                'ccd_temp'  => isset($input['CCD_TEMP']) ? floatval($input['CCD_TEMP']) : null,
                'offset'    => isset($input['OFFSET']) ? intval($input['OFFSET']) : null,
                'gain'      => isset($input['GAIN']) ? intval($input['GAIN']) : null,
                'scale'     => isset($input['SCALE']) ? floatval($input['SCALE']) : null,
                'date_obs'  => $input['DATE_OBS'] ?? null,
                'equinox'   => $input['EQUINOX'] ?? null,
                'filter'    => $input['FILTER'] ?? 'Luminance',
                'dec'       => floatval($input['DEC']),
                'ra'        => floatval($input['RA']),
                'object'    => $input['OBJECT'] ?? null,
                'objctdec'  => $input['OBJCTDEC'] ?? null,
                'objctra'   => $input['OBJCTRA'] ?? null,
                'sitelong'  => floatval($input['SITELONG']),
                'sitelat'   => floatval($input['SITELAT']),
                'bzero'     => isset($input['BZERO']) ? intval($input['BZERO']) : 0,
                'extend'    => $input['EXTEND'] ?? null,
                'airmass'   => floatval($input['AIRMASS']),

                'star_count'     => isset($input['STARS_COUNT']) ? intval($input['STARS_COUNT']) : null,
                'sky_background' => isset($input['SKY_BACKGROUND']) ? floatval($input['SKY_BACKGROUND']) : null,
                'devitation'     => isset($input['DEVIATION']) ? floatval($input['DEVIATION']) : null,

                'sigma' => isset($input['SIGMA']) ? floatval($input['SIGMA']) : null,
                'hfr'   => isset($input['MEAN_FWHM']) ? floatval($input['MEAN_FWHM']) : null,
                'fwhm'  => isset($input['MEAN_SNR']) ? floatval($input['MEAN_SNR']) : null,
            ];

            $filesModel->insert($insert);

            return $this->respondCreated($insert);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }
    }

    /**
     * @return ResponseInterface
     */
    public function image(): ResponseInterface {
        $files = $this->request->getFiles();

        if (!$files)  {
            return $this->fail('Files not found');
        }

        foreach ($files as $key => $file)  {
            $dirName = UPLOAD_FITS . $key . '/';

            if (!is_dir($dirName)) {
                mkdir($dirName,0777, true);
            }

            if (! $file->hasMoved()) {
                $file->move($dirName, $file->getClientName());

                $fileInfo = pathinfo($dirName . $file->getName());

                Services::image('gd')
                    ->withFile($dirName . $file->getName())
                    ->resize(24, 24, true, 'height')
                    ->save($dirName . $fileInfo['filename'] . '_thumb.' . $fileInfo['extension']);

                return $this->respondCreated($fileInfo);
            }
        }

        return $this->failServerError();
    }
}