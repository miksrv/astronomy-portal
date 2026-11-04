<?php

namespace Config;

/**
 * CDS services the objects are filled from (FEAT-31): the Sesame name resolver (any name → the
 * SIMBAD object, its coordinates and other names) and the SIMBAD TAP service (size, magnitude).
 * Both are public, no key. The defaults are the official CDS mirrors at Harvard: the main site
 * in Strasbourg did not answer from here when this was written. `.env` may point elsewhere:
 * `simbad.sesameUrl` = https://cds.unistra.fr/cgi-bin/nph-sesame,
 * `simbad.tapUrl`    = https://simbad.cds.unistra.fr/simbad/sim-tap/sync.
 */
class Simbad
{
    public const SESAME_URL = 'https://vizier.cfa.harvard.edu/viz-bin/nph-sesame';
    public const TAP_URL    = 'https://simbad.cfa.harvard.edu/simbad/sim-tap/sync';

    /**
     * Farther than this (degrees) from the coordinates we have, the SIMBAD answer is not trusted
     * on its own: either our coordinates are wrong or the name resolved to another object
     * (`Abell 74` → the galaxy cluster ACO 74, not the planetary nebula) — a person decides.
     * Closer offsets are kept: a frame center may be off the catalog center deliberately.
     */
    public const MATCH_DEGREES = 2.0;

    public static function sesameUrl(): string
    {
        return (string) (getenv('simbad.sesameUrl') ?: self::SESAME_URL);
    }

    public static function tapUrl(): string
    {
        return (string) (getenv('simbad.tapUrl') ?: self::TAP_URL);
    }
}
