<?php

namespace App\Libraries;

/**
 * The deep-sky catalog's pure helpers: normalising designations, and turning OpenNGC CSV rows
 * (`;`-separated, sexagesimal coordinates) into `catalog` rows and alias lists.
 *
 * Normalisation follows the observatory pipeline's `normalize_object_name()` (upper-case catalog
 * prefix glued to the number: `M 31`, `m_31` → `M31`; `NGC 7000` → `NGC7000`; `Sh2-155`,
 * `Sh2_103` → `SH2-155`, `SH2-103`), so names from FITS headers, our `objects` table and the
 * catalog meet on the same key. Unlike the pipeline it also drops leading zeros (`NGC0224` →
 * `NGC224`), because OpenNGC zero-pads its names.
 */
class CatalogLibrary
{
    /** Where `catalog:import` downloads the catalog from */
    public const SOURCE_URL = 'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/';

    public const SOURCE_FILES = ['NGC.csv', 'addendum.csv'];

    /** Rows that are not objects of their own: duplicates of another entry, and non-existent ones */
    private const SKIP_TYPES = ['Dup', 'NonEx'];

    /** Prefixes of the `Identifiers` column worth an alias (others are survey ids nobody types) */
    private const IDENTIFIER_PREFIXES = ['PGC', 'UGC', 'UGCA', 'LBN', 'LDN', 'MWSC', 'ESO', 'HCG', 'ARP', 'MRK', 'CL', 'MEL', 'C', 'B', 'SH2', 'ABELL'];

    /**
     * The normalised designation of a name, or null when it isn't a catalog designation
     * (`Andromeda Galaxy`, `C_2020_R4_ATLAS`, `T_CrB`).
     */
    public static function normalize(string $name): ?string
    {
        $name = trim($name);

        if ($name === '') {
            return null;
        }

        // Sharpless: `Sh2-155`, `SH 2-155`, `Sh2_103`
        if (preg_match('/^SH\s*2[\s_\-]*0*(\d+)$/i', $name, $m)) {
            return 'SH2-' . $m[1];
        }

        // ESO galaxies keep their two-part number: `ESO056-115` → `ESO56-115`
        if (preg_match('/^ESO[\s_\-]*0*(\d+)[\s_\-]+0*(\d+)$/i', $name, $m)) {
            return 'ESO' . $m[1] . '-' . $m[2];
        }

        // PREFIX + number (+ an optional letter suffix: `IC 1318B`, `NGC 5194A`)
        if (preg_match('/^([A-Za-z]+)[\s_\-]*0*(\d+)([A-Za-z]?)$/', $name, $m)) {
            $prefix = strtoupper($m[1]);

            // Comet / minor planet designations look like `C_2020` or `A807` — only the
            // catalogs the site actually uses count
            if (!in_array($prefix, ['M', 'NGC', 'IC', 'UGC', 'UGCA', 'PGC', 'MRK', 'ARP', 'HCG', 'LBN', 'LDN', 'MWSC', 'MEL', 'CL', 'C', 'B', 'ABELL', 'H'], true)) {
                return null;
            }

            // Messier stops at 110, Caldwell at 109 — `M_300` is an exposure, not an object
            if (($prefix === 'M' && (int) $m[2] > 110) || ($prefix === 'C' && (int) $m[2] > 109)) {
                return null;
            }

            return $prefix . $m[2] . strtoupper($m[3]);
        }

        return null;
    }

    /** Sexagesimal hours `05:35:16.48` → degrees */
    public static function parseRa(string $value): ?float
    {
        $parts = explode(':', trim($value));

        if (count($parts) !== 3 || !is_numeric($parts[0])) {
            return null;
        }

        return ((float) $parts[0] + (float) $parts[1] / 60 + (float) $parts[2] / 3600) * 15;
    }

    /** Sexagesimal degrees `-05:23:22.8` → degrees */
    public static function parseDec(string $value): ?float
    {
        $value = trim($value);
        $parts = explode(':', ltrim($value, '+-'));

        if (count($parts) !== 3 || !is_numeric($parts[0])) {
            return null;
        }

        $deg = (float) $parts[0] + (float) $parts[1] / 60 + (float) $parts[2] / 3600;

        return str_starts_with($value, '-') ? -$deg : $deg;
    }

    /**
     * Parses one OpenNGC CSV (header row included) into associative rows keyed by its column
     * names (`Name`, `Type`, `RA`, …).
     *
     * @return array<int, array<string, string>>
     */
    public static function parseCsv(string $csv): array
    {
        $lines  = preg_split('/\r\n|\n|\r/', trim($csv));
        $header = str_getcsv(array_shift($lines), ';', '"', '\\');
        $rows   = [];

        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }

            $values = str_getcsv($line, ';', '"', '\\');
            $rows[] = array_combine($header, array_pad(array_slice($values, 0, count($header)), count($header), ''));
        }

        return $rows;
    }

    /** True for a row that is a real object of its own (not a duplicate / non-existent entry) */
    public static function isObject(array $row): bool
    {
        return !in_array($row['Type'] ?? '', self::SKIP_TYPES, true);
    }

    /**
     * A `catalog` table row from an OpenNGC row, or null when it has no usable coordinates or no
     * designation of its own (components of multiple systems: `IC0080 NED01`, `IC0715NW`).
     */
    public static function toCatalogRow(array $row): ?array
    {
        $ra  = self::parseRa($row['RA'] ?? '');
        $dec = self::parseDec($row['Dec'] ?? '');
        $designation = self::normalize($row['Name'] ?? '');

        if ($ra === null || $dec === null || $designation === null) {
            return null;
        }

        return [
            'name'            => $row['Name'],
            'designation'     => $designation,
            'type'            => $row['Type'],
            'ra'              => round($ra, 6),
            'dec'             => round($dec, 6),
            'constellation'   => self::nullable($row['Const'] ?? ''),
            'maj_axis'        => self::number($row['MajAx'] ?? ''),
            'min_axis'        => self::number($row['MinAx'] ?? ''),
            'pos_angle'       => self::number($row['PosAng'] ?? '') === null ? null : (int) $row['PosAng'],
            'mag_b'           => self::number($row['B-Mag'] ?? ''),
            'mag_v'           => self::number($row['V-Mag'] ?? ''),
            'surf_brightness' => self::number($row['SurfBr'] ?? ''),
            'hubble'          => self::nullable($row['Hubble'] ?? ''),
            'messier'         => self::number($row['M'] ?? '') === null ? null : (int) $row['M'],
            'common_names'    => self::nullable(mb_substr($row['Common names'] ?? '', 0, 255)),
            'identifiers'     => self::nullable($row['Identifiers'] ?? ''),
        ];
    }

    /**
     * Every alias of a real object's row: its own designation, its Messier number, the NGC/IC
     * entries it is cross-identified with, and the useful survey identifiers.
     *
     * @return string[] normalised, unique
     */
    public static function aliasesOf(array $row): array
    {
        $aliases = [self::normalize($row['Name'] ?? '')];

        if (($row['M'] ?? '') !== '') {
            $aliases[] = 'M' . (int) $row['M'];
        }

        foreach (['NGC', 'IC'] as $catalog) {
            foreach (array_filter(explode(',', $row[$catalog] ?? '')) as $number) {
                $aliases[] = self::normalize($catalog . trim($number));
            }
        }

        foreach (array_filter(array_map('trim', explode(',', $row['Identifiers'] ?? ''))) as $identifier) {
            $alias  = self::normalize($identifier);
            $prefix = $alias === null ? null : (str_starts_with($alias, 'SH2-') ? 'SH2' : preg_replace('/[\d\-].*$/', '', $alias));

            if ($alias !== null && in_array($prefix, self::IDENTIFIER_PREFIXES, true)) {
                $aliases[] = $alias;
            }
        }

        return array_values(array_unique(array_filter($aliases)));
    }

    /**
     * For a duplicate entry (`Type = Dup`): its own normalised name and the designation of the
     * entry it duplicates (from its `NGC`/`IC`/`M` column), or null when the row names none.
     *
     * @return array{0: string, 1: string}|null
     */
    public static function duplicateOf(array $row): ?array
    {
        $self = self::normalize($row['Name'] ?? '');

        foreach (['NGC', 'IC', 'M'] as $catalog) {
            $first = trim(explode(',', $row[$catalog] ?? '')[0]);

            if ($first !== '' && $self !== null) {
                $target = self::normalize($catalog . $first);

                return $target === null ? null : [$self, $target];
            }
        }

        return null;
    }

    private static function nullable(string $value): ?string
    {
        $value = trim($value);

        return $value === '' ? null : $value;
    }

    private static function number(string $value): ?float
    {
        $value = trim($value);

        return is_numeric($value) ? (float) $value : null;
    }
}
