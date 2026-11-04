<?php

namespace App\Controllers;

use App\Libraries\LocaleLibrary;
use App\Models\CatalogModel;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

/**
 * The deep-sky reference catalog (OpenNGC, imported by `php spark catalog:import`): search for
 * the telescope job form and the object editor, and one object with all its designations.
 * Public and read-only.
 */
class Catalog extends BaseApiController
{
    public function __construct()
    {
        LocaleLibrary::init();
    }

    /**
     * `GET /catalog/search?q=M3&limit=10` — designation prefix or a part of a common name.
     */
    public function search(): ResponseInterface
    {
        $query = trim((string) $this->request->getGet('q'));
        $limit = (int) ($this->request->getGet('limit') ?? 10);

        if (mb_strlen($query) > 60) {
            return $this->respondInvalidRequest('catalog search: query longer than 60 characters');
        }

        try {
            return $this->respond(['items' => (new CatalogModel())->search($query, $limit)]);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
        }
    }

    /**
     * `GET /catalog/:name` — any designation (`M31`, `NGC_224`, `ngc 224`) → the object and
     * every alias it is known by.
     */
    public function show($id = null): ResponseInterface
    {
        $name = (string) $id;

        try {
            $model = new CatalogModel();
            $row   = $model->findByName(urldecode($name));

            if ($row === null) {
                return $this->respondNotFound(lang('Catalog.notFound'));
            }

            $item = CatalogModel::format($row);
            $item['aliases'] = $model->aliasesOf($item['id']);

            return $this->respond($item);
        } catch (Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
        }
    }
}
