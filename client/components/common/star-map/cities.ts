/**
 * Static city picker for the star map's location control.
 *
 * The backend geocoder proxy (BE-1 of features/star-atlas-upgrade.md) is deferred and
 * Business Rule 4 forbids calling a third-party geocoder from the browser, so "the Moon
 * over city X" is served from a small bundled catalog (`public/data/cities.json`, ~160
 * entries: Russian cities ≥500k and every regional center, CIS/Baltic capitals, major
 * world cities). Loaded lazily, same pattern as the other `/data/` catalogs.
 */

export type City = {
    /** Stable kebab-case id, e.g. 'saint-petersburg' */
    id: string
    /** Russian name */
    name: string
    /** English name */
    nameEn: string
    /** ISO 3166-1 alpha-2 country code */
    country: string
    /** City center, degrees, two decimals (≈1 km) */
    lat: number
    lon: number
}

// Cached per page load; reset on failure so a later interaction can retry.
let citiesPromise: Promise<City[]> | null = null

export const loadCities = (): Promise<City[]> => {
    citiesPromise ??= fetch('/data/cities.json')
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch /data/cities.json: ${response.status}`)
            }

            return response.json() as Promise<City[]>
        })
        .catch((error) => {
            citiesPromise = null
            console.error(error)
            return []
        })

    return citiesPromise
}

/** Locale-aware display name: Russian for 'ru', English otherwise. */
export const getCityDisplayName = (city: City, language?: string): string =>
    language === 'ru' ? city.name : city.nameEn

/** Lowercase + fold 'ё' into 'е' so "орел" finds "Орёл". */
const normalize = (value: string): string => value.trim().toLowerCase().replace(/ё/g, 'е')

/**
 * Case-insensitive substring match over both names, prefix matches ranked first,
 * then shorter names (mirrors `matchSearchItems` in searchIndex.ts). Queries shorter
 * than two characters yield nothing.
 */
export const matchCities = (cities: City[], query: string, limit: number = 8): City[] => {
    const needle = normalize(query)

    if (needle.length < 2) {
        return []
    }

    const keywordsOf = (city: City): string[] => [normalize(city.name), normalize(city.nameEn)]

    return cities
        .filter((city) => keywordsOf(city).some((keyword) => keyword.includes(needle)))
        .sort((a, b) => {
            const aPrefix = keywordsOf(a).some((keyword) => keyword.startsWith(needle)) ? 0 : 1
            const bPrefix = keywordsOf(b).some((keyword) => keyword.startsWith(needle)) ? 0 : 1

            return aPrefix - bPrefix || a.name.length - b.name.length
        })
        .slice(0, limit)
}

const EARTH_RADIUS_KM = 6371
const DEG = Math.PI / 180

/** Great-circle distance between two [lat, lon] points in kilometres (haversine). */
export const haversineKm = (a: [number, number], b: [number, number]): number => {
    const dLat = (b[0] - a[0]) * DEG
    const dLon = (b[1] - a[1]) * DEG
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * DEG) * Math.cos(b[0] * DEG) * Math.sin(dLon / 2) ** 2

    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** The closest catalog city within `maxKm` of the position, or null when none is that near. */
export const findNearestCity = (geopos: [number, number], cities: City[], maxKm: number = 25): City | null => {
    let best: { city: City; distance: number } | null = null

    for (const city of cities) {
        const distance = haversineKm(geopos, [city.lat, city.lon])

        if (distance <= maxKm && (!best || distance < best.distance)) {
            best = { city, distance }
        }
    }

    return best?.city ?? null
}
