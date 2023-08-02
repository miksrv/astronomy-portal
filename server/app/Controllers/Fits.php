<?php namespace App\Controllers;

use App\Models\FilesModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use ReflectionException;

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
                'ypixsz'    => isset($input['YPIXSZ']) ? floatval($input['YPIXSZ']) : NULL,
                'xpixsz'    => isset($input['XPIXSZ']) ? floatval($input['XPIXSZ']) : NULL,
                'naxis1'    => isset($input['NAXIS1']) ? intval($input['NAXIS1']) : NULL,
                'naxis2'    => isset($input['NAXIS2']) ? intval($input['NAXIS2']) : NULL,
                'naxis'     => isset($input['NAXIS']) ? intval($input['NAXIS']) : NULL,
                'bscale'    => isset($input['BSCALE']) ? intval($input['BSCALE']) : 0,
                'simple'    => isset($input['SIMPLE']) ? intval($input['SIMPLE']) : NULL,
                'bitpix'    => isset($input['BITPIX']) ? intval($input['BITPIX']) : NULL,
                'xbinning'  => isset($input['XBINNING']) ? intval($input['XBINNING']) : NULL,
                'ybinning'  => isset($input['YBINNING']) ? intval($input['YBINNING']) : NULL,
                'exptime'   => isset($input['EXPTIME']) ? intval($input['EXPTIME']) : NULL,
                'frame'     => $input['FRAME'] ?? NULL,
                'aptdia'    => isset($input['APTDIA']) ? intval($input['APTDIA']) : NULL,
                'focallen'  => isset($input['FOCALLEN']) ? intval($input['FOCALLEN']) : NULL,
                'comment'   => $input['COMMENT'] ?? NULL,
                'telescop'  => $input['TELESCOP'] ?? NULL,
                'observer'  => $input['OBSERVER'] ?? NULL,
                'instrume'  => $input['INSTRUME'] ?? NULL,
                'pixsize1'  => isset($input['PIXSIZE1']) ? floatval($input['PIXSIZE1']) : NULL,
                'pixsize2'  => isset($input['PIXSIZE2']) ? floatval($input['PIXSIZE2']) : NULL,
                'ccd_temp'  => isset($input['CCD_TEMP']) ? floatval($input['CCD_TEMP']) : NULL,
                'offset'    => isset($input['OFFSET']) ? intval($input['OFFSET']) : NULL,
                'gain'      => isset($input['GAIN']) ? intval($input['GAIN']) : NULL,
                'scale'     => isset($input['SCALE']) ? floatval($input['SCALE']) : NULL,
                'date_obs'  => $input['DATE_OBS'] ?? NULL,
                'equinox'   => $input['EQUINOX'] ?? NULL,
                'filter'    => $input['FILTER'] ?? 'Luminance',
                'dec'       => floatval($input['DEC']),
                'ra'        => floatval($input['RA']),
                'object'    => $input['OBJECT'] ?? NULL,
                'objctdec'  => $input['OBJCTDEC'] ?? NULL,
                'objctra'   => $input['OBJCTRA'] ?? NULL,
                'sitelong'  => floatval($input['SITELONG']),
                'sitelat'   => floatval($input['SITELAT']),
                'bzero'     => isset($input['BZERO']) ? intval($input['BZERO']) : 0,
                'extend'    => $input['EXTEND'] ?? NULL,
                'airmass'   => floatval($input['AIRMASS']),

                'star_count'     => isset($input['STARS_COUNT']) ? intval($input['STARS_COUNT']) : NULL,
                'sky_background' => isset($input['SKY_BACKGROUND']) ? floatval($input['SKY_BACKGROUND']) : NULL,
                'devitation'     => isset($input['DEVIATION']) ? floatval($input['DEVIATION']) : NULL,

                'sigma' => isset($input['SIGMA']) ? floatval($input['SIGMA']) : NULL,
                'hfr'   => isset($input['MEAN_FWHM']) ? floatval($input['MEAN_FWHM']) : NULL,
                'fwhm'  => isset($input['MEAN_SNR']) ? floatval($input['MEAN_SNR']) : NULL,
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
        $files = $this->request->getFile();

        if (!$files)  {
            throw PageNotFoundException::forPageNotFound();
        }

        foreach ($files as $key => $file)  {
            $dirName = UPLOAD_FITS . $key . '/';

            if (!is_dir($dirName)) {
                mkdir($dirName,0777, TRUE);
            }

            if (! $file->hasMoved()) {
                $file->move($dirName, $file->getClientName());

                $fileInfo = pathinfo($dirName . $file->getName());

                Services::image('gd')
                    ->withFile($dirName . $file->getName())
                    ->resize(24, 24, true, 'height')
                    ->save($dirName . $fileInfo['filename'] . '_thumb.' . $fileInfo['extension']);

                return $this->respondCreated();
            }
        }

        return $this->failServerError();
    }
}