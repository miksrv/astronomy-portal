<?php namespace App\Controllers;

use App\Models\AuthorModel;
use App\Models\PhotoModel;
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
        $modelAuthor = new AuthorModel();
        $modelPhotos = new PhotoModel();

        $dataPhotos  = $modelPhotos->select('author_id')->findAll();
        $dataAuthors = $modelAuthor->findAll();

        if (empty($dataPhotos))
        {
            return $this->respond(['items' => $dataAuthors]);
        }

        foreach ($dataPhotos as $photo)
        {
            $key = array_search($photo->author_id, array_column($dataAuthors, 'id'));

            if ($key === false) continue;

            $dataAuthors[$key]->photo_count = $dataAuthors[$key]->photo_count ? $dataAuthors[$key]->photo_count + 1 : 1;
        }

        return $this->respond(['items' => $dataAuthors]);
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
            $modelAuthor = new AuthorModel();
            $modelAuthor->insert($input);

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
            $modelAuthor = new AuthorModel();
            $dataAuthors  = $modelAuthor->find($id);

            if ($dataAuthors) {
                $modelAuthor->update($id, $input);
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
            $modelAuthor = new AuthorModel();
            $dataAuthors  = $modelAuthor->find($id);

            if ($dataAuthors) {
                $modelAuthor->delete($id);
                return $this->respondDeleted($dataAuthors);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }
}