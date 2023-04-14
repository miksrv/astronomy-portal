<?php namespace App\Controllers;

use App\Models\CatalogModel;
use App\Models\FilesModel;
use App\Models\PhotoModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
//header('Access-Control-Allow-Headers: Accept, AuthToken, Content-Type');

class Statistic extends ResourceController
{
    use ResponseTrait;

    /**
     * List of statistic summary data
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        $catalogModel = new CatalogModel();
        $photoModel   = new PhotoModel();
        $filesModel   = new FilesModel();

        $framesCount = $filesModel->select('id')->countAllResults();
        $exposureSum = $filesModel->selectSum('exptime')->first();

        return $this->respond([
            'photos_count'   => $photoModel->select('id')->countAllResults() ?? 0,
            'catalog_count'  => $catalogModel->select('name')->countAllResults() ?? 0,
            'frames_count'   => $framesCount ?? 0,
            'total_exposure' => $exposureSum->exptime ?? 0,
            'files_size'     => round($framesCount * FITS_FILE_SIZE) ?? 0
        ]);
    }

    public function catalog(): ResponseInterface
    {
        $catalogModel  = new CatalogModel();
        $catalogData   = $catalogModel->select('name')->findAll();
        $catalogResult = [];

        foreach ($catalogData as $item) {
            $catalogResult[] = $item->name;
        }

        return $this->respond([
            'items' => $catalogResult
        ]);
    }

    public function photos(): ResponseInterface
    {
        $photoModel  = new PhotoModel();
        $photoData   = $photoModel->select('object')->findAll();
        $photoResult = [];

        foreach ($photoData as $item) {
            $photoResult[] = $item->object;
        }

        return $this->respond([
            'items' => $photoResult
        ]);
    }
}