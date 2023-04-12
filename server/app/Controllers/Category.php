<?php namespace App\Controllers;

use App\Models\CategoryModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use Exception;

class Category extends ResourceController
{
    use ResponseTrait;

    /**
     * List of all category items
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        $categoryModel = new CategoryModel();

        return $this->respond(['items' => $categoryModel->findAll()]);
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
            'name' => 'required|alpha_dash|min_length[3]|max_length[40]|is_unique[category.name]'
        ];

        if (!$this->validate($rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $categoryModel = new CategoryModel();
            $categoryModel->insert($input);

            return $this->respondCreated($input);
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }

    /**
     * Update exist category item
     * @param null $id
     * @return ResponseInterface
     */
    public function update($id = null): ResponseInterface
    {
        $input = $this->request->getJSON(true);
        $rules = [
            'name' => 'required|alpha_dash|min_length[3]|max_length[40]|is_unique[category.name]'
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $categoryModel = new CategoryModel();
            $categoryData  = $categoryModel->find($id);

            if ($categoryData) {
                $categoryModel->update($id, $input);
                return $this->respondUpdated($input);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }

    /**
     * Hard delete category item
     * @param string|null $id
     * @return ResponseInterface
     */
    public function delete($id = null): ResponseInterface
    {
        try {
            $categoryModel = new CategoryModel();
            $categoryData   = $categoryModel->find($id);

            if ($categoryData) {
                $categoryModel->delete($id, true);
                return $this->respondDeleted($categoryData);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }
}