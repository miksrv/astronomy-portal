<?php namespace App\Controllers;

use App\Models\CatalogModel;
use App\Models\CategoryModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use Exception;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, PATCH');
header('Access-Control-Allow-Headers: X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization');

if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
    die();
}

class Category extends ResourceController
{
    use ResponseTrait;

    /**
     * List of all category items
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        $modelCategory = new CategoryModel();
        $modelCatalog  = new CatalogModel();

        $dataCatalog  = $modelCatalog->select('category')->findAll();
        $dataCategory = $modelCategory->findAll();

        if (empty($dataCatalog))
        {
            return $this->respond(['items' => $dataCategory]);
        }

        foreach ($dataCatalog as $item)
        {
            $key = array_search($item->category, array_column($dataCategory, 'id'));

            if ($key === false) continue;

            $dataCategory[$key]->object_count = $dataCategory[$key]->object_count ? $dataCategory[$key]->object_count + 1 : 1;
        }

        return $this->respond(['items' => $dataCategory]);
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
            'name' => 'required|min_length[3]|max_length[40]|is_unique[category.name]'
        ];

        if (!$this->validate($rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $modelCategory = new CategoryModel();
            $modelCategory->insert($input);

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
            'name' => 'required|min_length[3]|max_length[40]|is_unique[category.name]'
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $modelCategory = new CategoryModel();
            $dataCategory  = $modelCategory->find($id);

            if ($dataCategory) {
                $modelCategory->update($id, $input);
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
            $modelCategory = new CategoryModel();
            $dataCategory   = $modelCategory->find($id);

            if ($dataCategory) {
                $modelCategory->delete($id, true);
                return $this->respondDeleted($dataCategory);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }
}