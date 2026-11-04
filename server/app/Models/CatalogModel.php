<?php

namespace App\Models;

use App\Libraries\CatalogLibrary;

/**
 * CatalogModel
 *
 * The deep-sky reference catalog (`catalog`, OpenNGC) and its aliases (`catalog_aliases`): one
 * row per real object, every normalised designation of it pointing there. Filled by
 * `php spark catalog:import`; read-only on the site.
 */
class CatalogModel extends ApplicationBaseModel
{
    protected $table            = 'catalog';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'name',
        'designation',
        'type',
        'ra',
        'dec',
        'constellation',
        'maj_axis',
        'min_axis',
        'pos_angle',
        'mag_b',
        'mag_v',
        'surf_brightness',
        'hubble',
        'messier',
        'common_names',
        'name_ru',
        'identifiers',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * The catalog row any name resolves to (`M 31`, `NGC_224`, `IC1318B`), or null.
     */
    public function findByName(string $name): ?array
    {
        $alias = CatalogLibrary::normalize($name);

        if ($alias === null) {
            return null;
        }

        $row = $this->db->table('catalog_aliases a')
            ->select('c.*')
            ->join('catalog c', 'c.id = a.catalog_id')
            ->where('a.alias', $alias)
            ->get()
            ->getRowArray();

        return $row ?: null;
    }

    /**
     * Search for the job form / object editor: a designation prefix (`M3` → M3, M31, M32, …)
     * or a part of a common name (`androm`). Messier objects first, then the brightest.
     *
     * @return array<int, array> API-formatted rows
     */
    public function search(string $query, int $limit = 10): array
    {
        $query = trim($query);

        if ($query === '') {
            return [];
        }

        $alias = CatalogLibrary::normalize($query);
        // A bare prefix being typed (`M`, `NGC`, `ngc 7`) isn't a designation yet — search the
        // glued, upper-cased form as a prefix anyway
        $prefix = $alias ?? strtoupper(preg_replace('/[\s_]+/', '', $query));

        $builder = $this->db->table('catalog c')
            ->select('c.*, MIN(o.catalog_name) AS object_name')
            ->join('catalog_aliases a', 'a.catalog_id = c.id', 'left')
            ->join('objects o', 'o.catalog_id = c.id AND o.deleted_at IS NULL', 'left')
            ->groupStart()
                ->like('a.alias', $prefix, 'after')
                ->orLike('c.common_names', $query, 'both', null, true)
                ->orLike('c.name_ru', $query, 'both', null, true)
            ->groupEnd()
            ->groupBy('c.id')
            // Exact designation first, then Messier objects, then by brightness
            ->orderBy('CASE WHEN MAX(a.alias = ' . $this->db->escape($prefix) . ') THEN 0 ELSE 1 END', '', false)
            ->orderBy('CASE WHEN c.messier IS NULL THEN 1 ELSE 0 END', '', false)
            ->orderBy('COALESCE(c.mag_v, c.mag_b, 99)', '', false)
            ->limit(max(1, min($limit, 25)));

        return array_map(fn (array $row) => self::format($row), $builder->get()->getResultArray());
    }

    /**
     * Every alias of one catalog row (for the detail endpoint).
     *
     * @return string[]
     */
    public function aliasesOf(int $id): array
    {
        return array_column(
            $this->db->table('catalog_aliases')->select('alias')->where('catalog_id', $id)->orderBy('alias')->get()->getResultArray(),
            'alias'
        );
    }

    /**
     * The catalog facts of one of our objects, or null when it isn't linked.
     */
    public function getForObject(string $catalogName): ?array
    {
        $row = $this->db->table('objects o')
            ->select('c.*')
            ->join('catalog c', 'c.id = o.catalog_id')
            ->where('o.catalog_name', $catalogName)
            ->get()
            ->getRowArray();

        return $row ? self::format($row) : null;
    }

    /**
     * camelCase API shape of a catalog row.
     */
    public static function format(array $row): array
    {
        $commonNames = $row['common_names'] ? array_map('trim', explode(',', $row['common_names'])) : [];

        return [
            'id'             => (int) $row['id'],
            'name'           => $row['name'],
            'designation'    => $row['designation'],
            'messier'        => $row['messier'] !== null ? (int) $row['messier'] : null,
            'type'           => $row['type'],
            'ra'             => (float) $row['ra'],
            'dec'            => (float) $row['dec'],
            'constellation'  => $row['constellation'],
            'majAxis'        => $row['maj_axis'] !== null ? (float) $row['maj_axis'] : null,
            'minAxis'        => $row['min_axis'] !== null ? (float) $row['min_axis'] : null,
            'posAngle'       => $row['pos_angle'] !== null ? (int) $row['pos_angle'] : null,
            'magnitude'      => $row['mag_v'] !== null ? (float) $row['mag_v'] : ($row['mag_b'] !== null ? (float) $row['mag_b'] : null),
            'surfBrightness' => $row['surf_brightness'] !== null ? (float) $row['surf_brightness'] : null,
            'hubble'         => $row['hubble'],
            'commonNames'    => $commonNames,
            'nameRu'         => $row['name_ru'] ?? null,
            // Our own object page for it, when the observatory has shot it
            'objectName'     => $row['object_name'] ?? null,
        ];
    }
}
