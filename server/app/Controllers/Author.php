<?php

namespace App\Controllers;

use App\Libraries\SessionLibrary;
use App\Models\AuthorModel;
use App\Models\PhotoModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use Exception;

/** DEPRECATED **/
class Author extends ResourceController
{
    use ResponseTrait;

    private SessionLibrary $session;

    public function __construct()
    {
        $this->session = new SessionLibrary();
    }

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

        if (empty($dataPhotos)) {
            return $this->respond(['items' => $dataAuthors]);
        }

        $authorsById = array_column($dataAuthors, null, 'id');

        foreach ($dataPhotos as $photo) {
            $author = $authorsById[$photo->author_id] ?? null;

            if ($author === null) {
                continue;
            }

            $author->photo_count = $author->photo_count ? $author->photo_count + 1 : 1;
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
        if (!$this->session->isAuth) {
            return $this->failUnauthorized('Ошибка прав доступа');
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden('Ошибка прав доступа');
        }

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
            log_message('error', '{exception}', ['exception' => $e]);

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
        if (!$this->session->isAuth) {
            return $this->failUnauthorized('Ошибка прав доступа');
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden('Ошибка прав доступа');
        }

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
            log_message('error', '{exception}', ['exception' => $e]);

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
        if (!$this->session->isAuth) {
            return $this->failUnauthorized('Ошибка прав доступа');
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden('Ошибка прав доступа');
        }

        try {
            $modelAuthor = new AuthorModel();
            $dataAuthors  = $modelAuthor->find($id);

            if ($dataAuthors) {
                $modelAuthor->delete($id);
                return $this->respondDeleted($dataAuthors);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }
    }
}
