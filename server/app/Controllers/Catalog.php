<?php namespace App\Controllers;

use App\Libraries\CatalogLibrary;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\CatalogModel;
use Config\Services;
use Exception;

class Catalog extends ResourceController
{
    use ResponseTrait;

    /**
     * List of all catalog items
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        $catalogLibrary = new CatalogLibrary();

        return $this->respond(['items' => $catalogLibrary->getCatalogList()]);
    }

    /**
     * Catalog item by name
     * @param string|null $id
     * @return ResponseInterface
     */
    public function show($id = null): ResponseInterface
    {
        try {
            $catalogLibrary = new CatalogLibrary();

            $data = $catalogLibrary->getCatalogItemByName($id);

            if ($data) {
                return $this->respond($data);
            }

            return $this->failNotFound();

        } catch (Exception $e) {
            return $this->failServerError();
        }
    }

    /**
     * Create new catalog item
     * @param null $id
     * @return ResponseInterface
     */
    public function create($id = null): ResponseInterface
    {
        $input = $this->request->getJSON(true);
        $rules = [
            'name'      => 'required|alpha_dash|min_length[3]|max_length[40]|is_unique[catalog.name]',
            'title'     => 'max_length[200]',
            'text'      => 'string',
            'coord_ra'  => 'decimal',
            'coord_dec' => 'decimal',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $catalogModel = new CatalogModel();
            $catalogModel->insert($input);

            return $this->respondCreated($input);
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }

    /**
     * Update exist catalog item
     * @param null $id
     * @return ResponseInterface
     */
    public function update($id = null): ResponseInterface
    {
        $input = $this->request->getJSON(true);
        $rules = [
            'title'     => 'max_length[200]',
            'text'      => 'string',
            'coord_ra'  => 'decimal',
            'coord_dec' => 'decimal',
        ];

        unset($input['name']);

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $catalogModel = new CatalogModel();
            $catalogData  = $catalogModel->find($id);

            if ($catalogData) {
                $catalogModel->update($id, $input);
                return $this->respondUpdated($input);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }

    /**
     * Soft delete catalog item
     * @param string|null $id
     * @return ResponseInterface
     */
    public function delete($id = null): ResponseInterface
    {
        try {
            $model = new CatalogModel();
            $data  = $model->find($id);

            if ($data) {
                $model->delete($id);
                return $this->respondDeleted($data);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }
}