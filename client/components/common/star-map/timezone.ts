/**
 * Timezone resolution for the star map's location/time controls (Business Rule 12 of
 * features/star-atlas-upgrade.md): the wall-clock time a user picks is local to the
 * *selected place*, not to their browser. The place → timezone lookup runs over the
 * Natural Earth timezone polygons already shipped with d3-celestial's data files
 * (`public/data/timezones.json`, TopoJSON) — no new dependency, no backend call.
 *
 * Each polygon carries a representative IANA zone name (`tz_name1st`) used for a
 * DST-aware conversion via `Intl`, plus the plain standard offset (`zone`) as a
 * fallback when the IANA name is missing or unknown to the runtime.
 */

export type ResolvedTimeZone = {
    /** Representative IANA zone name for the polygon, e.g. 'Asia/Yekaterinburg' */
    zoneName?: string
    /**
     * Effective UTC offset in hours at resolution time. Computed from the IANA name via
     * Intl when possible; only falls back to the polygon's own stored offset — the
     * bundled Natural Earth data predates Russia's 2014 timezone reform (Moscow is
     * stored as +4, the Yekaterinburg zone as +6), so the stored number alone is stale.
     */
    utcOffset: number
}

export type TimezonePolygon = {
    zoneName?: string
    utcOffset: number
    /** First ring is the exterior, the rest are holes; rings are [lon, lat] pairs */
    rings: Array<Array<[number, number]>>
}

type TopoGeometry = {
    type: 'Polygon' | 'MultiPolygon'
    properties?: { zone?: number; tz_name1st?: string }
    arcs: unknown[]
}

type TimezoneTopology = {
    type: 'Topology'
    transform?: { scale: [number, number]; translate: [number, number] }
    arcs: Array<Array<[number, number]>>
    objects: Record<string, { type: 'GeometryCollection'; geometries: TopoGeometry[] }>
}

/** Decode one TopoJSON arc into absolute [lon, lat] points (delta-decoding + transform). */
const decodeArc = (arc: Array<[number, number]>, topology: TimezoneTopology): Array<[number, number]> => {
    const scale = topology.transform?.scale ?? [1, 1]
    const translate = topology.transform?.translate ?? [0, 0]

    let x = 0
    let y = 0

    return arc.map(([dx, dy]) => {
        x += dx
        y += dy
        return [x * scale[0] + translate[0], y * scale[1] + translate[1]]
    })
}

/** Stitch arc indices into a ring; a negative (bitwise-complement) index means the reversed arc. */
const decodeRing = (arcIndexes: number[], decodedArcs: Array<Array<[number, number]>>): Array<[number, number]> => {
    const ring: Array<[number, number]> = []

    for (const index of arcIndexes) {
        const source = decodedArcs[index >= 0 ? index : ~index] ?? []
        const arc = index >= 0 ? source : [...source].reverse()
        // Consecutive arcs share their endpoint — skip the duplicated first point
        ring.push(...(ring.length ? arc.slice(1) : arc))
    }

    return ring
}

/** Decode the timezones TopoJSON into flat polygons ready for point-in-polygon tests. */
export const decodeTimezonePolygons = (topology: TimezoneTopology): TimezonePolygon[] => {
    const decodedArcs = topology.arcs.map((arc) => decodeArc(arc, topology))
    const collection = Object.values(topology.objects)[0]
    const polygons: TimezonePolygon[] = []

    for (const geometry of collection?.geometries ?? []) {
        const utcOffset = geometry.properties?.zone
        if (typeof utcOffset !== 'number') {
            continue
        }

        const base = { zoneName: geometry.properties?.tz_name1st || undefined, utcOffset }

        if (geometry.type === 'Polygon') {
            polygons.push({ ...base, rings: (geometry.arcs as number[][]).map((r) => decodeRing(r, decodedArcs)) })
        } else if (geometry.type === 'MultiPolygon') {
            for (const poly of geometry.arcs as number[][][]) {
                polygons.push({ ...base, rings: poly.map((r) => decodeRing(r, decodedArcs)) })
            }
        }
    }

    return polygons
}

/** Ray-casting point-in-ring test; point and ring vertices are [lon, lat]. */
export const isPointInRing = (point: [number, number], ring: Array<[number, number]>): boolean => {
    const [px, py] = point
    let inside = false

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i] as [number, number]
        const [xj, yj] = ring[j] as [number, number]

        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
            inside = !inside
        }
    }

    return inside
}

const isPointInPolygon = (point: [number, number], polygon: TimezonePolygon): boolean => {
    const exterior = polygon.rings[0]

    if (!exterior || !isPointInRing(point, exterior)) {
        return false
    }

    // Inside the exterior — make sure the point isn't inside any hole
    return !polygon.rings.slice(1).some((hole) => isPointInRing(point, hole))
}

/**
 * Resolve the timezone for a geographic position. Falls back to the solar
 * approximation round(lon / 15) outside any polygon (open ocean).
 */
export const resolveTimeZone = (
    lat: number,
    lon: number,
    polygons: TimezonePolygon[],
    date: Date = new Date()
): ResolvedTimeZone => {
    const point: [number, number] = [lon, lat]
    const match = polygons.find((polygon) => isPointInPolygon(point, polygon))

    if (!match) {
        return { utcOffset: Math.round(lon / 15) }
    }

    const intlOffset = match.zoneName ? getZoneOffsetMinutes(date, match.zoneName) : null

    return {
        zoneName: match.zoneName,
        utcOffset: intlOffset != null ? intlOffset / 60 : match.utcOffset
    }
}

const dtfCache: Record<string, Intl.DateTimeFormat> = {}

/**
 * The zone's UTC offset in minutes at a specific instant (DST-aware), via Intl.
 * Returns null when the runtime doesn't know the zone name.
 */
export const getZoneOffsetMinutes = (date: Date, zoneName: string): number | null => {
    try {
        dtfCache[zoneName] ??= new Intl.DateTimeFormat('en-US', {
            timeZone: zoneName,
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })

        const parts: Record<string, string> = {}
        for (const part of dtfCache[zoneName].formatToParts(date)) {
            parts[part.type] = part.value
        }

        const asUTC = Date.UTC(
            Number(parts.year),
            Number(parts.month) - 1,
            Number(parts.day),
            Number(parts.hour) % 24,
            Number(parts.minute),
            Number(parts.second)
        )

        return Math.round((asUTC - date.getTime()) / 60_000)
    } catch {
        return null
    }
}

/**
 * Interpret a `datetime-local` value ('YYYY-MM-DDTHH:mm') as wall-clock time in the
 * resolved zone and return the absolute instant. DST-aware when the IANA name is
 * usable, otherwise the polygon's fixed standard offset applies.
 */
export const wallClockToDate = (value: string, timeZone: ResolvedTimeZone): Date | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
    if (!match) {
        return null
    }

    const [, year = 0, month = 1, day = 1, hour = 0, minute = 0] = match.map(Number)
    const wallUTC = Date.UTC(year, month - 1, day, hour, minute)

    if (timeZone.zoneName) {
        // Iterate twice so a guess landing on the wrong side of a DST switch corrects itself
        let guess = wallUTC - timeZone.utcOffset * 3_600_000
        let known = false

        for (let i = 0; i < 2; i++) {
            const offset = getZoneOffsetMinutes(new Date(guess), timeZone.zoneName)
            if (offset == null) {
                break
            }
            known = true
            guess = wallUTC - offset * 60_000
        }

        if (known) {
            return new Date(guess)
        }
    }

    return new Date(wallUTC - timeZone.utcOffset * 3_600_000)
}

/** Format an absolute instant as the zone's wall-clock 'YYYY-MM-DDTHH:mm' (for a datetime-local input). */
export const dateToWallClock = (date: Date, timeZone: ResolvedTimeZone): string => {
    // `?? ` (not `||`): an Intl offset of 0 minutes (e.g. London in winter, Iceland) is a
    // valid answer and must not fall back to the polygon's stale pre-2014 stored offset
    const intlOffset = timeZone.zoneName ? getZoneOffsetMinutes(date, timeZone.zoneName) : null
    const offset = intlOffset ?? timeZone.utcOffset * 60
    const shifted = new Date(date.getTime() + offset * 60_000)
    const pad = (n: number) => String(n).padStart(2, '0')

    return (
        `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
        `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
    )
}

/** Human-readable offset label, e.g. 'UTC+05:00' */
export const formatUtcOffset = (timeZone: ResolvedTimeZone, date: Date = new Date()): string => {
    // Same `??` rationale as dateToWallClock: a legitimate zero Intl offset must win
    const intlOffset = timeZone.zoneName ? getZoneOffsetMinutes(date, timeZone.zoneName) : null
    const minutes = intlOffset ?? timeZone.utcOffset * 60
    const sign = minutes < 0 ? '-' : '+'
    const abs = Math.abs(minutes)
    const pad = (n: number) => String(n).padStart(2, '0')

    return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

// Lazily fetched + decoded once per page load; ~516 KB, so it only loads when the
// user actually interacts with the location/time controls.
let timezonesPromise: Promise<TimezonePolygon[]> | null = null

export const loadTimezonePolygons = (): Promise<TimezonePolygon[]> => {
    timezonesPromise ??= fetch('/data/timezones.json')
        .then((response) => response.json())
        .then((topology: TimezoneTopology) => decodeTimezonePolygons(topology))
        .catch((error) => {
            timezonesPromise = null
            console.error(error)
            return []
        })

    return timezonesPromise
}
