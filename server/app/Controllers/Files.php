<?php

namespace App\Controllers;

use App\Models\ObjectModel;
use App\Models\ObjectFitsFilesModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use Exception;

class Files extends ResourceController
{
    use ResponseTrait;

    private ObjectFitsFilesModel $filesModel;

    public function __construct() {
        $this->filesModel = new ObjectFitsFilesModel();
    }

    public function show($id = null): ResponseInterface
    {
        helper('filters');

        try {
            $filesData = $this->filesModel->getFilesByObject($id);

            if (count($filesData)) {
                foreach ($filesData as $file) {
                    $file->filter = mappingFilters($file->filter);
                }
            }

            return $this->respond([
                'count' => count($filesData),
                'items' => $filesData
        ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('Objects.serverError'));
        }
    }

    /**
     * @return ResponseInterface
     */
    public function updates(): ResponseInterface
    {
        $apiKey = $this->request->getGet('key', FILTER_SANITIZE_SPECIAL_CHARS) ?? '';
        $input  = json_decode($this->request->getJSON(true));

        if (!$apiKey || $apiKey !== getenv('app.fitsApiKey')) {
            return $this->failUnauthorized('Invalid API key');
        }

        if (!isset($input->DEC) || !isset($input->RA)) {
            return $this->fail('No RA or DEC coordinates');
        }

        try {
            $objectsModel = new ObjectModel();
            $modelFiles   = new ObjectFitsFileModel();
            $fileId       = md5($input->FILE_NAME);
            $fileObject   = str_replace(' ', '_', $input->OBJECT);

            $dataFile = [
                'id'        => $fileId,
                'file_name' => $input->FILE_NAME,
                'ypixsz'    => isset($input->YPIXSZ) ? floatval($input->YPIXSZ) : null,
                'xpixsz'    => isset($input->XPIXSZ) ? floatval($input->XPIXSZ) : null,
                'naxis1'    => isset($input->NAXIS1) ? intval($input->NAXIS1) : null,
                'naxis2'    => isset($input->NAXIS2) ? intval($input->NAXIS2) : null,
                'naxis'     => isset($input->NAXIS) ? intval($input->NAXIS) : null,
                'bscale'    => isset($input->BSCALE) ? intval($input->BSCALE) : 0,
                'simple'    => isset($input->SIMPLE) ? intval($input->SIMPLE) : null,
                'bitpix'    => isset($input->BITPIX) ? intval($input->BITPIX) : null,
                'xbinning'  => isset($input->XBINNING) ? intval($input->XBINNING) : null,
                'ybinning'  => isset($input->YBINNING) ? intval($input->YBINNING) : null,
                'exptime'   => isset($input->EXPTIME) ? intval($input->EXPTIME) : null,
                'frame'     => $input->FRAME ?? null,
                'aptdia'    => isset($input->APTDIA) ? intval($input->APTDIA) : null,
                'focallen'  => isset($input->FOCALLEN) ? intval($input->FOCALLEN) : null,
                'comment'   => $input->COMMENT ?? null,
                'telescop'  => $input->TELESCOP ?? null,
                'observer'  => $input->OBSERVER ?? null,
                'instrume'  => $input->INSTRUME ?? null,
                'pixsize1'  => isset($input->PIXSIZE1) ? floatval($input->PIXSIZE1) : null,
                'pixsize2'  => isset($input->PIXSIZE2) ? floatval($input->PIXSIZE2) : null,
                'ccd_temp'  => isset($input->CCD_TEMP) ? floatval($input->CCD_TEMP) : null,
                'offset'    => isset($input->OFFSET) ? intval($input->OFFSET) : null,
                'gain'      => isset($input->GAIN) ? intval($input->GAIN) : null,
                'scale'     => isset($input->SCALE) ? floatval($input->SCALE) : null,
                'date_obs'  => $input->DATE_OBS ?? null,
                'equinox'   => $input->EQUINOX ?? null,
                'filter'    => $input->FILTER ?? 'Luminance',
                'dec'       => floatval($input->DEC),
                'ra'        => floatval($input->RA),
                'object'    => $fileObject,
                'objctdec'  => $input->OBJCTDEC ?? null,
                'objctra'   => $input->OBJCTRA ?? null,
                'sitelong'  => floatval($input->SITELONG),
                'sitelat'   => floatval($input->SITELAT),
                'bzero'     => isset($input->BZERO) ? intval($input->BZERO) : 0,
                'extend'    => $input->EXTEND ?? null,
                'airmass'   => floatval($input->AIRMASS),

                'star_count'     => isset($input->STARS_COUNT) ? intval($input->STARS_COUNT) : null,
                'sky_background' => isset($input->SKY_BACKGROUND) ? floatval($input->SKY_BACKGROUND) : null,
                'devitation'     => isset($input->DEVIATION) ? floatval($input->DEVIATION) : null,

                'sigma' => isset($input->SIGMA) ? floatval($input->SIGMA) : null,
                'hfr'   => isset($input->MEAN_FWHM) ? floatval($input->MEAN_FWHM) : null,
                'fwhm'  => isset($input->MEAN_SNR) ? floatval($input->MEAN_SNR) : null,
            ];

            if (!$objectsModel->find($fileObject)) {
                $dataCatalog = [
                    'name'        => $fileObject,
                    'title'       => str_replace('_', ' ', $fileObject),
                    'category'    => 1,
                    'text'        => '',
                    'source_link' => '',
                    'image'       => '',
                    'coord_ra'    => $dataFile['ra'],
                    'coord_dec'   => $dataFile['dec'],
                ];

                $objectsModel->insert($dataCatalog);
            }

            if ($modelFiles->find($fileId)) {
                unset($dataFile['id']);

                $modelFiles->update($fileId, $dataFile);

                return $this->respondUpdated(['file' => $dataFile['file_name']]);
            }

            $modelFiles->insert($dataFile);

            return $this->respondCreated($dataFile);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }
    }

    /**
     * @return ResponseInterface
     */
    public function image(): ResponseInterface
    {
        $apiKey = $this->request->getGet('key', FILTER_SANITIZE_SPECIAL_CHARS) ?? '';
        $files  = $this->request->getFiles();

        if (!$apiKey || $apiKey !== getenv('app.fitsApiKey')) {
            log_message('error', 'Invalid API key');

            return $this->failUnauthorized('Invalid API key');
        }

        if (!$files)  {
            log_message('error', 'No files to download');

            return $this->fail('Files not found');
        }

        try {
            foreach ($files as $key => $file)  {
                $dirName = UPLOAD_FITS . $key . '/';

                if (file_exists($dirName . $file->getClientName())) {
                    return $this->failResourceExists();
                }

                if (!is_dir($dirName)) {
                    mkdir($dirName,0777, true);
                }

                if (!$file->hasMoved()) {
                    $file->move($dirName, $file->getClientName());

                    $fileInfo = pathinfo($dirName . $file->getName());

                    Services::image('gd')
                        ->withFile($dirName . $file->getName())
                        ->resize(24, 24, true, 'height')
                        ->save($dirName . $fileInfo['filename'] . '_thumb.' . $fileInfo['extension']);

                    return $this->respondCreated($fileInfo);
                }
            }
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }

        return $this->failServerError();
    }
}