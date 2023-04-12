<?php namespace App\Controllers;

use App\Libraries\PhotosLibrary;
use App\Models\CatalogModel;
use App\Models\PhotoModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use Exception;
use function PHPUnit\Framework\fileExists;

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
     * Photo item by name and date (optional).
     * If there are more than 2 photos with the same object (name) and no date is used,
     * this function will return the newest photo.
     * @param null $id
     * @param null $date
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
     * Create new photo item.
     * First, use the photo upload function, which returns the data of the uploaded image.
     * @param null $id
     * @return ResponseInterface
     */
    public function create($id = null): ResponseInterface
    {
        $input = $this->request->getJSON(true);
        $rules = [
            'object' => 'required|alpha_dash|min_length[3]|max_length[40]',
            'date'   => 'required|string|valid_date[m/d/Y]',
            'author' => 'numeric',
            'image_name' => 'required|alpha_dash',
            'image_ext'  => 'required|alpha_dash',
            'image_size' => 'required|numeric'
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $catalogModel = new CatalogModel();
        $catalogData  = $catalogModel->find($input['object']);

        if (!$catalogData)
        {
            return $this->failValidationErrors('Object by name "' . $input['object'] . '" not found');
        }

        $photoOrigPath  = WRITEPATH . 'uploads/' . $input['image_name'] . '.' . $input['image_ext'];
        $photoThumbPath = WRITEPATH . 'uploads/' . $input['image_name'] . '_thumb.' . $input['image_ext'];

        if (!file_exists($photoOrigPath) || !file_exists($photoThumbPath))
        {
            return $this->failValidationErrors('Uploaded photo files for this object not found');
        }

        try {
            $catalogModel = new PhotoModel();
            $catalogModel->insert($input);

            $dateFormat  = date_format(date_create($input['date']), 'Y.m.d');
            $image_orig  = new \CodeIgniter\Files\File($photoOrigPath);
            $image_thumb = new \CodeIgniter\Files\File($photoThumbPath);

            $image_orig->move(FCPATH . 'photos/', $input['object'] . '-' . $dateFormat . '.' . $input['image_ext']);
            $image_thumb->move(FCPATH . 'photos/', $input['object'] . '-' . $dateFormat . '_thumb.' . $input['image_ext']);

            return $this->respondCreated($input);
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }

    /**
     * Uploads a new photo, create a thumbnail and return the data of the uploaded photo.
     * @return ResponseInterface
     */
    public function upload(): ResponseInterface
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
            $name = pathinfo($file, PATHINFO_FILENAME);

            $image = \Config\Services::image('gd'); // imagick
            $image->withFile($file->getRealPath())
                ->fit(265, 200, 'center')
                ->save($uploadDir . '/' . $name . '_thumb.' . $file->getExtension());

            return $this->respondCreated([
                'image_name' => $name,
                'image_ext'  => $file->getExtension(),
                'image_size' => $file->getSize(),
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
        $input = $this->request->getJSON(true);
        $rules = [
            'object' => 'required|alpha_dash|min_length[3]|max_length[40]',
            'date'   => 'required|string|valid_date[m/d/Y]',
            'author' => 'numeric'
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $photoModel = new PhotoModel();
            $photoData  = $photoModel->find($id);

            if ($photoData) {
                $photoModel->update($id, $input);
                return $this->respondUpdated($input);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }

    /**
     * Soft delete photo item
     * @param null $id
     * @return ResponseInterface
     */
    public function delete($id = null): ResponseInterface
    {
        try {
            $photoModel = new PhotoModel();
            $photoData  = $photoModel->find($id);

            if ($photoData) {
                $photoModel->delete($id);
                return $this->respondDeleted($photoData);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            return $this->failServerError();
        }
    }
}