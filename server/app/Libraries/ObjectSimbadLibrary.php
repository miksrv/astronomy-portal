<?php

namespace App\Libraries;

use CodeIgniter\I18n\Time;
use Config\Simbad;

/**
 * Fills an object from SIMBAD (FEAT-31) — shared by `objects:simbad` and `POST /objects`.
 *
 * - **match**: SIMBAD's position is within `Simbad::MATCH_DEGREES` of ours (or we have none):
 *   the type, size, aliases and SIMBAD id are stored; the magnitude only when the editor left it
 *   empty and it is the object's own (not a nebula's central star); our coordinates stay (a
 *   frame center may be off the catalog center on purpose) unless we had none.
 * - **far**: farther than that — our coordinates are wrong or the name means another object.
 *   Nothing is stored unless a person accepts it (`objects:simbad --accept=M_94`); then the
 *   coordinates are SIMBAD's too.
 * - **not_found**: SIMBAD doesn't know the name; only the time of the check is stored.
 * - **moving**: a comet, asteroid or planet — it has no fixed position, SIMBAD is not asked.
 */
class ObjectSimbadLibrary
{
    /** Categories of moving bodies, same as `MOVING_CATEGORIES` in client/utils/visibility.ts */
    public const MOVING_CATEGORIES = [8, 9, 10, 12];

    /**
     * SIMBAD types whose V magnitude is not the object's: for a planetary nebula it is the
     * central star (M 27 → 14ᵐ), and the other nebulae have none worth showing
     */
    private const NO_MAGNITUDE_TYPES = ['PN', 'HII', 'SNR', 'RNe', 'DNe', 'GNe', 'ISM', 'EmO', 'Cld', 'MoC', 'sh', 'bub', 'Rad', '~'];

    public function __construct(private readonly SimbadClient $client = new SimbadClient())
    {
    }

    /**
     * Looks the object up and decides what to store.
     *
     * @param array $object `catalog_name`, `ra`, `dec`, `magnitude` of the objects row
     * @param int[] $categories
     * @param bool  $accept store even a far answer (a person checked it)
     *
     * @return array{status: string, offset: ?float, simbad: ?array, update: array}
     */
    public function check(array $object, array $categories = [], bool $accept = false): array
    {
        if (array_intersect(array_map('intval', $categories), self::MOVING_CATEGORIES)) {
            return ['status' => 'moving', 'offset' => null, 'simbad' => null, 'update' => []];
        }

        $simbad = $this->client->lookup((string) $object['catalog_name']);
        $now    = Time::now('UTC')->toDateTimeString();

        if ($simbad === null) {
            return ['status' => 'not_found', 'offset' => null, 'simbad' => null, 'update' => ['simbad_checked_at' => $now]];
        }

        return self::decide($object, $simbad, $accept, $now);
    }

    /**
     * The decision for a SIMBAD answer, without the network (see the class comment).
     *
     * @return array{status: string, offset: ?float, simbad: array, update: array}
     */
    public static function decide(array $object, array $simbad, bool $accept, string $now): array
    {
        $ra  = isset($object['ra']) ? (float) $object['ra'] : null;
        $dec = isset($object['dec']) ? (float) $object['dec'] : null;

        // A NOT NULL column without a value holds 0/0
        $hasPosition = $ra !== null && $dec !== null && !($ra == 0.0 && $dec == 0.0);
        $offset      = $hasPosition ? SimbadClient::distance($ra, $dec, $simbad['ra'], $simbad['dec']) : null;
        $status      = $offset === null || $offset <= Simbad::MATCH_DEGREES ? 'match' : 'far';

        if ($status === 'far' && !$accept) {
            return ['status' => $status, 'offset' => $offset, 'simbad' => $simbad, 'update' => []];
        }

        $update    = self::columns($simbad, $now);
        $magnitude = self::ownMagnitude($simbad['type'], $simbad['magnitude']);

        if (!isset($object['magnitude']) && $magnitude !== null) {
            $update['magnitude'] = $magnitude;
        }

        if (!$hasPosition || $status === 'far') {
            $update['ra']  = round($simbad['ra'], 6);
            $update['dec'] = round($simbad['dec'], 6);
        }

        return ['status' => $status, 'offset' => $offset, 'simbad' => $simbad, 'update' => $update];
    }

    /** The SIMBAD columns of `objects` for an answer of `SimbadClient::lookup()` */
    public static function columns(array $simbad, string $now): array
    {
        return [
            'simbad_id'         => $simbad['simbadId'],
            'object_type'       => $simbad['type'],
            'maj_axis'          => $simbad['majAxis'],
            'min_axis'          => $simbad['minAxis'],
            'aliases'           => json_encode(array_values($simbad['aliases']), JSON_UNESCAPED_UNICODE),
            'simbad_checked_at' => $now,
        ];
    }

    /**
     * The SIMBAD facts the editor looked up in the object form (`GET /objects/simbad/:name`) and
     * saved with it, as columns; null when the body carries none or nonsense.
     */
    public static function columnsFromForm(mixed $facts, string $now): ?array
    {
        if (!is_array($facts) || !is_string($facts['simbadId'] ?? null) || trim($facts['simbadId']) === '') {
            return null;
        }

        $number  = static fn ($value) => is_numeric($value) && (float) $value > 0 ? (float) $value : null;
        $aliases = is_array($facts['aliases'] ?? null) ? $facts['aliases'] : [];

        return self::columns([
            'simbadId' => mb_substr(trim($facts['simbadId']), 0, 80),
            'type'     => is_string($facts['type'] ?? null) && $facts['type'] !== '' ? mb_substr($facts['type'], 0, 16) : null,
            'majAxis'  => $number($facts['majAxis'] ?? null),
            'minAxis'  => $number($facts['minAxis'] ?? null),
            'aliases'  => array_slice(array_values(array_filter($aliases, 'is_string')), 0, 30),
        ], $now);
    }

    /** SIMBAD's V magnitude when it is the object's own: not a nebula's (its central star's) */
    public static function ownMagnitude(?string $type, ?float $magnitude): ?float
    {
        return $magnitude !== null && !in_array($type, self::NO_MAGNITUDE_TYPES, true) ? $magnitude : null;
    }
}
