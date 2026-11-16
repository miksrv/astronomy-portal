<?php

namespace App\Controllers;

use App\Models\PhotosModel;
use App\Models\ObjectsModel;
use App\Models\EventsModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\I18n\Time;

class Sitemap extends BaseApiController
{
    /**
     * Ids with the last-modified time of every photo, object and event, for the
     * frontend's sitemap. The time is ISO 8601 with its offset (e.g.
     * 2025-01-11T08:55:52+05:00): the same shape for all three lists, and one a
     * crawler reads without guessing the server's time zone.
     *
     * @return ResponseInterface
     */
    public function index(): ResponseInterface
    {
        $photosModel  = new PhotosModel();
        $objectsModel = new ObjectsModel();
        $eventsModel  = new EventsModel();

        return $this->respond([
            'photos'  => $this->toItems($photosModel->select('id, updated_at')->findAll(), 'id'),
            'objects' => $this->toItems($objectsModel->select('catalog_name, updated_at')->findAll(), 'catalog_name'),
            'events'  => $this->toItems($eventsModel->select('id, updated_at')->findAll(), 'id'),
        ]);
    }

    /**
     * @param array  $rows    Entities with the id column and updated_at
     * @param string $idField The column that makes the page URL
     * @return array<int, array{id: string, updated: string|null}>
     */
    private function toItems(array $rows, string $idField): array
    {
        return array_map(fn ($row) => [
            'id'      => $row->{$idField},
            'updated' => $this->toIso($row->updated_at),
        ], $rows);
    }

    private function toIso(mixed $value): ?string
    {
        if (empty($value)) {
            return null;
        }

        try {
            return ($value instanceof Time ? $value : Time::parse((string) $value))->format('c');
        } catch (\Exception) {
            return null;
        }
    }
}
