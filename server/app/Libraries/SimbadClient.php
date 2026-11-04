<?php

namespace App\Libraries;

use Config\Services;
use Config\Simbad;
use RuntimeException;
use SimpleXMLElement;

/**
 * Looks an object up in SIMBAD (FEAT-31): the Sesame resolver turns any name ("M_33", "Sh2-155",
 * "NGC 598") into the SIMBAD object with its coordinates, type and other names; the TAP service
 * adds the angular size and the V magnitude. Only the backend calls it, and the result is stored
 * in `objects` — the site never waits for CDS when a page is viewed.
 *
 * `lookup()` returns null when SIMBAD doesn't know the name and throws a RuntimeException when
 * the service can't be reached or answers nonsense.
 */
class SimbadClient
{
    /** Catalogs whose names are worth keeping as aliases (SIMBAD lists dozens of survey ids) */
    private const ALIAS_CATALOGS = [
        'M', 'NGC', 'IC', 'UGC', 'PGC', 'LEDA', 'MCG', 'Arp', 'HCG', 'Mrk', 'ACO', 'Abell',
        'LBN', 'LDN', 'B', 'Ced', 'vdB', 'RCW', 'Gum', 'Sh', 'SH', 'Cl', 'PN', 'SN', 'Stock', 'Tr', 'Berkeley',
    ];

    private const MAX_ALIASES = 30;

    public function __construct(private readonly int $timeout = 15)
    {
    }

    /**
     * @return array{simbadId: string, ra: float, dec: float, type: ?string, majAxis: ?float,
     *               minAxis: ?float, magnitude: ?float, aliases: string[]}|null
     */
    public function lookup(string $name): ?array
    {
        $query  = self::queryName($name);
        $sesame = self::parseSesame($this->get(rtrim(Simbad::sesameUrl(), '/') . '/-oxpI/S?' . rawurlencode($query)));

        if ($sesame === null) {
            return null;
        }

        $basic = self::parseTap($this->tap(
            'SELECT b.otype, b.galdim_majaxis, b.galdim_minaxis, f.flux '
            . 'FROM basic AS b LEFT JOIN flux AS f ON f.oidref = b.oid AND f.filter = \'V\' '
            . 'WHERE b.main_id = \'' . str_replace("'", "''", $sesame['simbadId']) . '\''
        ));

        return [
            'simbadId'  => self::cleanName($sesame['simbadId']),
            'ra'        => $sesame['ra'],
            'dec'       => $sesame['dec'],
            'type'      => $basic['type'] ?? $sesame['type'],
            'majAxis'   => $basic['majAxis'] ?? null,
            'minAxis'   => $basic['minAxis'] ?? null,
            'magnitude' => $basic['magnitude'] ?? null,
            'aliases'   => $sesame['aliases'],
        ];
    }

    /**
     * Our object name as Sesame understands it: `M_33` → `M 33`, `Sh2_103` → `Sh 2-103`,
     * `2023ixf` → `SN 2023ixf`, `Haumea_(2003_EL61)` → `Haumea`.
     */
    public static function queryName(string $name): string
    {
        $name = trim((string) preg_replace('/[\s_]+/', ' ', $name));
        $name = trim((string) preg_replace('/\s*\(.*\)\s*$/', '', $name));

        if (preg_match('/^Sh\s?2[\s-]+(\d+)$/i', $name, $match)) {
            return 'Sh 2-' . $match[1];
        }

        if (preg_match('/^\d{4}[a-z]{1,3}$/', $name)) {
            return 'SN ' . $name;
        }

        return $name;
    }

    /**
     * The Sesame answer (`-oxpI`): null when nothing was found.
     *
     * @return array{simbadId: string, ra: float, dec: float, type: ?string, aliases: string[]}|null
     */
    public static function parseSesame(string $xml): ?array
    {
        $previous = libxml_use_internal_errors(true);
        $document = simplexml_load_string($xml);
        libxml_use_internal_errors($previous);

        if (!$document instanceof SimpleXMLElement) {
            throw new RuntimeException('Sesame: not an XML answer');
        }

        $resolver = $document->Target->Resolver ?? null;

        if (!$resolver || (string) $resolver->oname === '' || (string) $resolver->jradeg === '') {
            return null;
        }

        $aliases = [];

        foreach ($resolver->alias as $alias) {
            $alias = self::alias((string) $alias);

            if ($alias !== null) {
                $aliases[$alias] = true;
            }
        }

        return [
            'simbadId' => (string) $resolver->oname,
            'ra'       => (float) $resolver->jradeg,
            'dec'      => (float) $resolver->jdedeg,
            'type'     => (string) $resolver->otype !== '' ? (string) $resolver->otype : null,
            'aliases'  => array_slice(array_keys($aliases), 0, self::MAX_ALIASES),
        ];
    }

    /**
     * The first row of a TAP answer in JSON (`otype, galdim_majaxis, galdim_minaxis, flux`).
     *
     * @return array{type: ?string, majAxis: ?float, minAxis: ?float, magnitude: ?float}|null
     */
    public static function parseTap(string $json): ?array
    {
        $data = json_decode($json, true);

        if (!is_array($data) || !isset($data['data'])) {
            throw new RuntimeException('SIMBAD TAP: not a JSON table');
        }

        $row = $data['data'][0] ?? null;

        if (!is_array($row)) {
            return null;
        }

        $number = static fn ($value) => is_numeric($value) && (float) $value > 0 ? (float) $value : null;

        return [
            'type'      => is_string($row[0] ?? null) && $row[0] !== '' ? trim($row[0]) : null,
            'majAxis'   => $number($row[1] ?? null),
            'minAxis'   => $number($row[2] ?? null),
            'magnitude' => is_numeric($row[3] ?? null) ? round((float) $row[3], 2) : null,
        ];
    }

    /**
     * A SIMBAD identifier as people write it, or null when it is a survey id nobody uses:
     * `NAME Triangulum Galaxy` → `Triangulum Galaxy`, `SH 2-103` → `Sh 2-103`, `M  33` → `M 33`.
     */
    public static function alias(string $id): ?string
    {
        $id = self::cleanName($id);

        if (str_starts_with($id, 'NAME ')) {
            return substr($id, 5);
        }

        $catalog = strtok($id, ' ');

        if ($catalog === false || !in_array($catalog, self::ALIAS_CATALOGS, true) || $catalog === $id) {
            return null;
        }

        // PN: only the Abell planetaries (`PN A66 74`), not the galactic-coordinate ids
        if ($catalog === 'PN' && !str_starts_with($id, 'PN A66 ')) {
            return null;
        }

        return str_starts_with($id, 'SH 2-') ? 'Sh' . substr($id, 2) : $id;
    }

    /** `M  33` → `M 33`, `NAME Hoag's Object` stays as it is */
    public static function cleanName(string $id): string
    {
        return trim((string) preg_replace('/\s+/', ' ', $id));
    }

    /** Great-circle distance between two RA/Dec points, degrees */
    public static function distance(float $ra1, float $dec1, float $ra2, float $dec2): float
    {
        [$ra1, $dec1, $ra2, $dec2] = array_map('deg2rad', [$ra1, $dec1, $ra2, $dec2]);

        $a = sin(($dec2 - $dec1) / 2) ** 2 + cos($dec1) * cos($dec2) * sin(($ra2 - $ra1) / 2) ** 2;

        return rad2deg(2 * asin(min(1, sqrt($a))));
    }

    private function tap(string $query): string
    {
        $response = $this->http()->post(Simbad::tapUrl(), [
            'form_params' => ['REQUEST' => 'doQuery', 'LANG' => 'ADQL', 'FORMAT' => 'json', 'QUERY' => $query],
        ]);

        return $this->body('SIMBAD TAP', $response->getStatusCode(), $response->getBody());
    }

    private function get(string $url): string
    {
        $response = $this->http()->get($url);

        return $this->body('Sesame', $response->getStatusCode(), $response->getBody());
    }

    private function body(string $service, int $status, string $body): string
    {
        if ($status !== 200) {
            throw new RuntimeException("{$service}: HTTP {$status}");
        }

        return $body;
    }

    private function http(): \CodeIgniter\HTTP\CURLRequest
    {
        // Not the shared instance: its options would stick to the next caller
        return Services::curlrequest([
            'timeout'         => $this->timeout,
            'connect_timeout' => min(5, $this->timeout),
            'http_errors'     => false,
        ], null, null, false);
    }
}
