<?php

namespace App\Controllers;

use App\Models\ObjectFitsFilesModel;
use CodeIgniter\HTTP\ResponseInterface;
use Exception;

/**
 * Class Files
 *
 * Lists the FITS frames of an object. The archive is read-only now: nothing feeds
 * `objects_fits_files` any more, the table stays for the statistics built on it.
 *
 * @package App\Controllers
 *
 * @method ResponseInterface show($id = null) Retrieves and returns files associated with a specific object.
 */
class Files extends BaseApiController
{
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

            return $this->respondServerError();
        }
    }
}
