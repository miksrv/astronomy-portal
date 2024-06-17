<?php namespace App\Controllers;

use App\Libraries\CatalogLibrary;
use App\Libraries\SessionLibrary;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\CatalogModel;
use Config\Services;
use Exception;

class Catalog extends ResourceController {
    use ResponseTrait;

    private SessionLibrary $session;

    public function __construct() {
        $this->session = new SessionLibrary();
    }

    /**
     * List of all catalog items
     * @return ResponseInterface
     */
    public function list(): ResponseInterface {
        $catalogLibrary = new CatalogLibrary();

        return $this->respond(['items' => $catalogLibrary->getCatalogList()]);
    }

    /**
     * Catalog item by name
     * @param string|null $id
     * @return ResponseInterface
     */
    public function show($id = null): ResponseInterface {
        try {
            $catalogLibrary = new CatalogLibrary();

            $data = $catalogLibrary->getCatalogItemByName($id);

            if ($data) {
                return $this->respond($data);
            }

            return $this->failNotFound();

        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }
    }

    /**
     * Create new catalog item
     * @param null $id
     * @return ResponseInterface
     */
    public function create($id = null): ResponseInterface {
        $input = $this->request->getJSON(true);
        $rules = [
            'name'        => 'required|alpha_dash|min_length[3]|max_length[40]|is_unique[catalog.name]',
            'title'       => 'max_length[200]',
            'category'    => 'required|integer|greater_than[0]',
            'text'        => 'string',
            'image'       => 'string',
            'source_link' => 'string|max_length[50]',
            'coord_ra'    => 'decimal',
            'coord_dec'   => 'decimal',
        ];

        if (!$this->validate($rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        try {
            $input['image'] = $this->_saveCatalogImage($input['name'], $input['image']);
            $catalogModel = new CatalogModel();
            $catalogModel->insert($input);

            return $this->respondCreated($input);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }
    }

    /**
     * Update exist catalog item
     * @param null $id
     * @return ResponseInterface
     */
    public function update($id = null): ResponseInterface {
        $input = $this->request->getJSON(true);
        $rules = [
            'title'       => 'max_length[200]',
            'text'        => 'string',
            'image'       => 'string',
            'source_link' => 'string|max_length[50]',
            'coord_ra'    => 'decimal',
            'coord_dec'   => 'decimal',
        ];

        unset($input['name']);

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        try {
            $input['image'] = $this->_saveCatalogImage($id, $input['image']);
            $catalogModel = new CatalogModel();
            $catalogData  = $catalogModel->find($id);

            if ($catalogData) {
                $catalogModel->update($id, $input);
                return $this->respondUpdated($input);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }
    }

    /**
     * Soft delete catalog item
     * @param string|null $id
     * @return ResponseInterface
     */
    public function delete($id = null): ResponseInterface {
        if ($this->session->user->role !== 'admin') {
            return $this->failValidationErrors('Ошибка прав доступа');
        }

        try {
            $catalogModel = new CatalogModel();
            $catalogData  = $catalogModel->find($id);

            if ($catalogData) {
                $catalogModel->delete($id);
                return $this->respondDeleted($catalogData);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }
    }

    /**
     * Stores the image passed as a base64 string
     */
    protected function _saveCatalogImage(string $name, string $imageString): ?string {
        $fileName = $name . '.png';

        if (empty($imageString))
            return null;

        try {
            if (!is_dir(UPLOAD_MAPS))
            {
                mkdir(UPLOAD_MAPS,0777, TRUE);
            }

            $imageString = str_replace('data:image/png;base64,', '', $imageString);
            $imageString = str_replace(' ', '+', $imageString);
            $imageString = base64_decode($imageString);

            helper('filesystem');
            write_file(UPLOAD_MAPS . $fileName, $imageString);

            return $fileName;
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return null;
        }
    }
}