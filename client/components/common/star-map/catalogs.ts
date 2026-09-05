/**
 * Lazy loaders for the name catalogs the search box and the object info panel need.
 *
 * d3-celestial fetches starnames.json/dsonames.json itself at display time, but keeps
 * them in a private closure (nothing is exported), so they cannot be read back from the
 * library — these fetches are effectively free anyway: the browser's HTTP cache already
 * has the files by the time a user opens search or clicks an object.
 */

export type StarName = {
    /** IAU proper name, e.g. 'Vega' (empty string when the star has none) */
    name?: string
    /** Russian proper name, when known */
    ru?: string
    /** Short designation, e.g. 'α' or a variable-star code */
    desig?: string
    /** Bayer letter */
    bayer?: string
    /** Constellation abbreviation, e.g. 'Lyr' */
    c?: string
    hip?: string
}

/** Keyed by HIP number (as a plain digit string, matching stars.6.json feature ids) */
export type StarNamesMap = Record<string, StarName>

export type DsoName = {
    name?: string
    ru?: string
}

/** Keyed by DSO catalog id, matching dsos.*.json feature ids (e.g. 'NGC 224') */
export type DsoNamesMap = Record<string, DsoName>

export type ConstellationEntry = {
    /** Three-letter IAU abbreviation, e.g. 'And' */
    id: string
    /** English/IAU name */
    name: string
    /** Russian name, when present in the catalog */
    ru?: string
    /** Label position [ra, dec] in degrees */
    coordinates: [number, number]
}

type ConstellationFeature = {
    id: string
    properties?: { name?: string; ru?: string; display?: number[] }
    geometry?: { coordinates?: number[] }
}

const fetchJson = async <T>(url: string): Promise<T> => {
    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`)
    }

    return response.json() as Promise<T>
}

// Cached per page load; reset on failure so a later interaction can retry.
let starNamesPromise: Promise<StarNamesMap> | null = null
let dsoNamesPromise: Promise<DsoNamesMap> | null = null
let constellationsPromise: Promise<ConstellationEntry[]> | null = null

export const loadStarNames = (): Promise<StarNamesMap> => {
    starNamesPromise ??= fetchJson<StarNamesMap>('/data/starnames.json').catch((error) => {
        starNamesPromise = null
        console.error(error)
        return {}
    })

    return starNamesPromise
}

export const loadDsoNames = (): Promise<DsoNamesMap> => {
    dsoNamesPromise ??= fetchJson<DsoNamesMap>('/data/dsonames.json').catch((error) => {
        dsoNamesPromise = null
        console.error(error)
        return {}
    })

    return dsoNamesPromise
}

export const loadConstellations = (): Promise<ConstellationEntry[]> => {
    constellationsPromise ??= fetchJson<{ features: ConstellationFeature[] }>('/data/constellations.json')
        .then((collection) =>
            (collection.features ?? [])
                .map((feature): ConstellationEntry | null => {
                    // geometry.coordinates is the label position; `display` is form-zoom data
                    const position = feature.geometry?.coordinates ?? feature.properties?.display
                    const [ra, dec] = position ?? []

                    if (!feature.id || ra === undefined || dec === undefined) {
                        return null
                    }

                    return {
                        id: feature.id,
                        name: feature.properties?.name ?? feature.id,
                        ru: feature.properties?.ru,
                        coordinates: [ra, dec]
                    }
                })
                .filter((entry): entry is ConstellationEntry => entry != null)
        )
        .catch((error) => {
            constellationsPromise = null
            console.error(error)
            return []
        })

    return constellationsPromise
}

export type CatalogPosition = {
    /** Feature id: HIP number for stars, catalog id for DSOs */
    id: string
    /** J2000 degrees, as stored in the data files */
    ra: number
    dec: number
    mag?: number
}

type CatalogFeature = {
    id?: string | number
    /** dsos.6.json (and a few dsos.bright.json entries) store mag as a string, e.g. "1.2" */
    properties?: { mag?: number | string }
    geometry?: { coordinates?: number[] }
}

export const parseCatalogPositions = (collection: { features?: CatalogFeature[] }): CatalogPosition[] =>
    (collection.features ?? [])
        .map((feature): CatalogPosition | null => {
            const [ra, dec] = feature.geometry?.coordinates ?? []

            if (feature.id === undefined || ra === undefined || dec === undefined) {
                return null
            }

            // Coerce the mixed number/string mag to a real number; absent or
            // non-numeric values become undefined so consumers can rely on the type
            const magnitude = Number(feature.properties?.mag)

            return { id: String(feature.id), ra, dec, mag: Number.isFinite(magnitude) ? magnitude : undefined }
        })
        .filter((entry): entry is CatalogPosition => entry != null)

// d3-celestial keeps its loaded star/DSO features in a private closure (nothing is
// bound to Celestial.container for the built-in layers), so hit-testing and search
// re-fetch the same files — already in the browser's HTTP cache.
let starCatalogPromise: Promise<CatalogPosition[]> | null = null
const dsoCatalogPromises: Record<string, Promise<CatalogPosition[]> | undefined> = {}

export const loadStarCatalog = (): Promise<CatalogPosition[]> => {
    starCatalogPromise ??= fetchJson<{ features: CatalogFeature[] }>('/data/stars.6.json')
        .then(parseCatalogPositions)
        .catch((error) => {
            starCatalogPromise = null
            console.error(error)
            return []
        })

    return starCatalogPromise
}

/** file: 'dsos.bright.json' (default set) or 'dsos.6.json' (the "more objects" catalog) */
export const loadDsoCatalog = (file: string): Promise<CatalogPosition[]> => {
    dsoCatalogPromises[file] ??= fetchJson<{ features: CatalogFeature[] }>(`/data/${file}`)
        .then(parseCatalogPositions)
        .catch((error) => {
            dsoCatalogPromises[file] = undefined
            console.error(error)
            return []
        })

    return dsoCatalogPromises[file]
}

/** Locale-aware display name for a star; falls back to designation, then 'HIP <id>'. */
export const getStarDisplayName = (hipId: string, names: StarNamesMap, language?: string): string => {
    const entry = names[hipId]
    const proper = (language === 'ru' ? entry?.ru : undefined) || entry?.name

    if (proper) {
        return proper
    }

    const designation = entry?.bayer || entry?.desig
    if (designation && entry?.c) {
        return `${designation} ${entry.c}`
    }

    return entry?.hip || `HIP ${hipId}`
}

/** Locale-aware display name for a DSO; falls back to the catalog id (e.g. 'NGC 224'). */
export const getDsoDisplayName = (dsoId: string, names: DsoNamesMap, language?: string): string => {
    const entry = names[dsoId]
    const proper = (language === 'ru' ? entry?.ru : undefined) || entry?.name

    return proper ? `${proper} (${dsoId})` : dsoId
}
