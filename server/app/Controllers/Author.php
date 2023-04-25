<?php namespace App\Controllers;

use App\Models\AuthorsModel;
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

class Author extends ResourceController
{
    use ResponseTrait;

    /**
     * List of all authors
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        $modelAuthors = new AuthorsModel();

        return $this->respond(['items' => $modelAuthors->findAll()]);
    }
    
    /**
     * Create new author
     * @param null $id
     * @return ResponseInterface
     */
    public function create($id = null): ResponseInterface
    {
        $input = $this->request->getJSON(true);
        $rules = [
            'name' => 'required|min_length[3]|max_length[100]',
        ];

        if (!$this->validate($rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $modelAuthors = new AuthorsModel();
            $modelAuthors->insert($input);

            return $this->respondCreated($input);
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }

    /**
     * Update exist author
     * @param null $id
     * @return ResponseInterface
     */
    public function update($id = null): ResponseInterface
    {
        $input = $this->request->getJSON(true);
        $rules = [
            'name' => 'required|min_length[3]|max_length[100]'
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $modelAuthors = new AuthorsModel();
            $dataAuthors  = $modelAuthors->find($id);

            if ($dataAuthors) {
                $modelAuthors->update($id, $input);
                return $this->respondUpdated($input);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }

    /**
     * Soft delete author
     * @param string|null $id
     * @return ResponseInterface
     */
    public function delete($id = null): ResponseInterface
    {
        try {
            $modelAuthors = new AuthorsModel();
            $dataAuthors  = $modelAuthors->find($id);

            if ($dataAuthors) {
                $modelAuthors->delete($id);
                return $this->respondDeleted($dataAuthors);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }
}