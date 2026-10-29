/**
 * Angle helpers shared by the star map's pure modules. Every RA/azimuth wrap in the map
 * goes through here, so the conventions stay in one place:
 *
 * - astronomy-engine and the info panel use RA/azimuth in degrees [0, 360);
 * - d3-celestial's data files (and therefore `Celestial.mapProjection()`) store the
 *   longitude in (-180, 180] — see toCelestialLon.
 */

/** Degrees → radians factor */
export const DEG = Math.PI / 180

/**
 * Wrap an angle (degrees) into [0, 360). Values already in range are returned untouched:
 * the modulo dance would otherwise nudge them by a float epsilon, which is visible when a
 * permalink is decoded and re-encoded.
 */
export const normalizeDegrees = (degrees: number): number =>
    degrees >= 0 && degrees < 360 ? degrees : ((degrees % 360) + 360) % 360

/**
 * RA in degrees (any range) → the longitude d3-celestial expects, in (-180, 180]: exactly
 * 180 stays 180, anything above it wraps negative. This is the same rule the map's own
 * data files follow, so a converted coordinate projects where the catalog feature does.
 */
export const toCelestialLon = (raDegrees: number): number => {
    const ra = normalizeDegrees(raDegrees)

    return ra > 180 ? ra - 360 : ra
}

/** Shortest separation (degrees, [0, 180]) between two angles, regardless of how they are wrapped. */
export const shortestAngleDeg = (delta: number): number => {
    const wrapped = normalizeDegrees(delta)

    return wrapped > 180 ? 360 - wrapped : wrapped
}
