<?php namespace App\Controllers;

use App\Libraries\PhotosLibrary;
use App\Models\PhotoModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use Exception;

class Photo extends ResourceController
{
    use ResponseTrait;

    /**
     * List of all photos
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        $filterObject = $this->request->getGet('object', FILTER_SANITIZE_STRING);
        $photoLibrary = new PhotosLibrary();

        return $this->respond(['items' => $photoLibrary->getPhotoList($filterObject)]);
    }

    /**
     * Photo item by name
     * @param null $id
     * @return ResponseInterface
     */
    public function show($id = null, $date = null): ResponseInterface
    {
        try {
            $photoLibrary = new PhotosLibrary();
            $photoItem    = $photoLibrary->getPhotoByObject($id, $date);

            if ($photoItem) {
                return $this->respond($photoItem);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            return $this->failNotFound();
        }
    }

    /**
     * Create new photo item
     * @param null $id
     * @return ResponseInterface
     */
    public function create($id = null): ResponseInterface
    {
        $input = $this->request->getJSON(true);
        $rules = [
            'object' => 'required|alpha_dash|min_length[3]|max_length[40]',
            'date'   => 'required|string|valid_date',
            'author' => 'numeric',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $catalogModel = new PhotoModel();
            $catalogModel->insert($input);

            return $this->respondCreated($input);
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }

    public function upload()
    {
        $rules = [
            'image' => 'uploaded[image]|is_image[image]|mime_in[image,image/jpg,image/jpeg,image/gif,image/png,image/webp]'
        ];

        if (!$this->validate($rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $img = $this->request->getFile('image');

        if (! $img->hasMoved()) {
            $uploadDir = WRITEPATH . 'uploads';

            $newName = $img->getRandomName();
            $img->move($uploadDir, $newName);

            $file = new \CodeIgniter\Files\File($uploadDir . '/' . $newName);

            /* */
//            $image = \Config\Services::image('imagick');
//            $image->withFile($file->getRealPath())
//                ->fit(100, 100, 'center')
//                ->save($uploadDir . '/thumb_' . $newName);

            return $this->respondCreated([
                'file_name' => $file->getBasename(),
                'file_ext'  => $file->getExtension(),
                'file_size' => $file->getSize(),
            ]);
        }

        return $this->failServerError();
    }

    /**
     * Update exist photo item
     * @param null $id
     * @return ResponseInterface
     */
    public function update($id = null): ResponseInterface
    {
        return $this->respond([]);
    }

    /**
     * Soft delete photo item
     * @param null $id
     * @return ResponseInterface
     */
    public function delete($id = null): ResponseInterface
    {
        return $this->respond([]);
    }
}