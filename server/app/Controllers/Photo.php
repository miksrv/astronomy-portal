<?php namespace App\Controllers;

use App\Libraries\PhotosLibrary;
use App\Models\CatalogModel;
use App\Models\PhotoModel;
use CodeIgniter\Files\File;
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

class Photo extends ResourceController {
    use ResponseTrait;

    /**
     * List of all photos
     * @return ResponseInterface
     */
    public function list(): ResponseInterface {
        $filterObject = $this->request->getGet('object', FILTER_SANITIZE_SPECIAL_CHARS);
        $filterLimit  = $this->request->getGet('limit', FILTER_SANITIZE_NUMBER_INT);
        $orderColumn  = $this->request->getGet('order', FILTER_SANITIZE_SPECIAL_CHARS) ?? 'date';
        $photoLibrary = new PhotosLibrary();

        return $this->respond([
            'items' => $photoLibrary->getPhotoList($filterObject, $filterLimit ?? 0, $orderColumn)
        ]);
    }

    /**
     * Photo item by name and date (optional).
     * If there are more than 2 photos with the same object (name) and no date is used,
     * this function will return the newest photo.
     * @param null $id
     * @param null $date
     * @return ResponseInterface
     */
    public function show($id = null, $date = null): ResponseInterface {
        try {
            $photoLibrary = new PhotosLibrary();
            $photoItem    = $photoLibrary->getPhotoByObject($id, $date);

            if ($photoItem) {
                return $this->respond($photoItem);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failNotFound();
        }
    }

    /**
     * Download photo as file
     * @param $id
     * @param $date
     * @return ResponseInterface
     */
    public function download($id = null, $date = null): ResponseInterface {
        try {
            $photoModel = new PhotoModel();
            $photoData  = $photoModel
                ->select('image_name, image_ext')
                ->where(['object' => $id, 'date' => $date])
                ->first();

            $photoLink  = UPLOAD_PHOTOS .  $photoData->image_name . '.' . $photoData->image_ext;

            if ($photoData && file_exists($photoLink)) {
                return $this->response->download($photoLink, null);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failNotFound();
        }
    }

    /**
     * Create new photo item.
     * First, use the photo upload function, which returns the data of the uploaded image.
     * @param null $id
     * @return ResponseInterface
     */
    public function create($id = null): ResponseInterface {
        $input = $this->request->getJSON(true);
        $rules = [
            'object' => 'required|alpha_dash|min_length[3]|max_length[40]',
            'date'   => 'required|string|valid_date[Y-m-d]',
            'author_id'  => 'numeric',
            'image_name' => 'required|alpha_dash',
            'image_ext'  => 'required|alpha_dash'
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $catalogModel = new CatalogModel();
        $catalogData  = $catalogModel->find($input['object']);

        if (!$catalogData)  {
            return $this->failValidationErrors('Object by name "' . $input['object'] . '" not found');
        }

        $photoOrigPath  = UPLOAD_TEMP . $input['image_name'] . '.' . $input['image_ext'];
        $photoThumbPath = UPLOAD_TEMP . $input['image_name'] . '_thumb.' . $input['image_ext'];

        if (!file_exists($photoOrigPath) || !file_exists($photoThumbPath)) {
            return $this->failValidationErrors('Uploaded photo files for this object not found');
        }

        try {
            $dateFormat = date_format(date_create($input['date']), 'Y.m.d');
            $photosName = $input['object'] . '-' . $dateFormat;
            $imageFull  = new File($photoOrigPath);
            $imageThumb = new File($photoThumbPath);

            $imageFull->move(UPLOAD_PHOTOS, $photosName . '.' . $input['image_ext']);
            $imageThumb->move(UPLOAD_PHOTOS, $photosName . '_thumb.' . $input['image_ext']);

            $image = Services::image('gd'); // imagick
            $image->withFile(UPLOAD_PHOTOS . $photosName . '.' . $input['image_ext'])
                ->fit(160, 36, 'center')
                ->save(UPLOAD_PHOTOS . $photosName . '_80x18.' . $input['image_ext']);

            $movedOriginal = new File(UPLOAD_PHOTOS . $photosName . '.' . $input['image_ext']);

            list($width, $height) = getimagesize($movedOriginal);

            $input['image_name']   = $photosName;
            $input['image_size']   = $movedOriginal->getSize();
            $input['image_width']  = $width;
            $input['image_height'] = $height;
            $input['filters']      = isset($input['filters']) ? json_encode($input['filters']) : null;

            $catalogModel = new PhotoModel();
            $catalogModel->insert($input);

            return $this->respondCreated($input);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }
    }

    /**
     * Uploads a new photo, create a thumbnail and return the data of the uploaded photo.
     * @return ResponseInterface
     */
    public function upload(): ResponseInterface {
        $rules = [
            'image' => 'uploaded[image]|is_image[image]|mime_in[image,image/jpg,image/jpeg,image/gif,image/png,image/webp]'
        ];

        if (!$this->validate($rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $img = $this->request->getFile('image');

        if (!$img->hasMoved()) {

            if (!is_dir(UPLOAD_TEMP)) {
                mkdir(UPLOAD_TEMP,0777, TRUE);
            }

            $newName = $img->getRandomName();
            $img->move(UPLOAD_TEMP, $newName);

            $file = new File(UPLOAD_TEMP . $newName);
            $name = pathinfo($file, PATHINFO_FILENAME);

            $image = Services::image('gd'); // imagick
            $image->withFile($file->getRealPath())
                ->fit(700, 500, 'center')
                ->save(UPLOAD_TEMP . $name . '_thumb.' . $file->getExtension());

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
    public function update($id = null): ResponseInterface {
        $input = $this->request->getJSON(true);
        $rules = [
            'object'    => 'required|alpha_dash|min_length[3]|max_length[40]',
            'date'      => 'required|string|valid_date[Y-m-d]',
            'author_id' => 'numeric'
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $photoModel = new PhotoModel();
            $photoData  = $photoModel->find($id);

            if ($photoData) {
                $input['filters'] = isset($input['filters']) ? json_encode($input['filters']) : null;

                $photoModel->update($id, $input);
                return $this->respondUpdated($input);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }
    }

    /**
     * Soft delete photo item
     * @param null $id
     * @return ResponseInterface
     */
    public function delete($id = null): ResponseInterface {
        try {
            $photoModel = new PhotoModel();
            $photoData  = $photoModel->find($id);

            if ($photoData) {
                $photoModel->delete($id);
                return $this->respondDeleted($photoData);
            }

            return $this->failNotFound();
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError();
        }
    }
}