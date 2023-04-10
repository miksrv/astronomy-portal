<?php namespace App\Controllers;

use App\Libraries\CatalogLibrary;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\CatalogModel;
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
//        $item = new \App\Entities\Catalog();
//        $item->name = '111';

        $json = $this->request->getJSON(true);

        var_dump($json);
        exit();

        return $this->respondCreated(['test' => $id]);
    }

    /**
     * Update exist catalog item
     * @param string $name
     * @return ResponseInterface
     */
//    public function update(string $name): ResponseInterface
//    {
//        return $this->respond([]);
//    }

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