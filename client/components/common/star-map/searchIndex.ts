import { formatObjectName } from '@/utils/strings'

import {
    CatalogPosition,
    ConstellationEntry,
    DsoNamesMap,
    getDsoDisplayName,
    getStarDisplayName,
    StarNamesMap
} from './catalogs'
import { CelestialObjectKind } from './objectInfo'
import { StarMapObject } from './StarMap'

/**
 * In-memory search index for FE-4 (features/star-atlas-upgrade.md): portal objects,
 * named stars, loaded DSOs, constellations and solar-system bodies. Built once when
 * the search box first opens; a simple case-insensitive substring match is enough
 * for a catalog this size — no fuzzy-matching dependency.
 */

export type SearchItemKind = CelestialObjectKind | 'constellation' | 'portal'

export type SearchItem = {
    kind: SearchItemKind
    /** Display name in the current locale */
    name: string
    /** Secondary line: designation / catalog id */
    secondary?: string
    /** Lowercased strings the query is matched against */
    keywords: string[]
    /** J2000 degrees; solar-system bodies have none here — their position is computed on select */
    ra?: number
    dec?: number
    /** Portal object name / HIP number / DSO catalog id / astronomy-engine Body / constellation id */
    id: string
    magnitude?: number
}

const toKeywords = (...values: Array<string | undefined>): string[] =>
    values.filter((value): value is string => Boolean(value && value.trim())).map((value) => value.toLowerCase())

export type SearchIndexInput = {
    language?: string
    portalObjects?: StarMapObject[]
    starNames: StarNamesMap
    dsoNames: DsoNamesMap
    constellations: ConstellationEntry[]
    /** Star catalog positions (loadStarCatalog) — coordinates for the named stars */
    starPositions: CatalogPosition[]
    /** Positions of the currently displayed DSO catalog (loadDsoCatalog) */
    dsoPositions: CatalogPosition[]
    /** Localized labels for the Sun, Moon and planets, keyed by astronomy-engine Body name */
    bodyLabels: Record<string, string>
}

export const buildSearchIndex = (input: SearchIndexInput): SearchItem[] => {
    const items: SearchItem[] = []
    const language = input.language

    for (const object of input.portalObjects ?? []) {
        if (object.name && object.ra !== undefined && object.dec !== undefined) {
            const displayName = formatObjectName(object.name)

            items.push({
                kind: 'portal',
                id: object.name,
                name: displayName,
                keywords: toKeywords(displayName, object.name),
                ra: Number(object.ra),
                dec: Number(object.dec)
            })
        }
    }

    for (const [bodyName, label] of Object.entries(input.bodyLabels)) {
        items.push({
            kind: bodyName === 'Sun' ? 'sun' : bodyName === 'Moon' ? 'moon' : 'planet',
            id: bodyName,
            name: label,
            keywords: toKeywords(label, bodyName)
        })
    }

    for (const constellation of input.constellations) {
        items.push({
            kind: 'constellation',
            id: constellation.id,
            name: (language === 'ru' ? constellation.ru : undefined) || constellation.name,
            secondary: constellation.id,
            keywords: toKeywords(constellation.name, constellation.ru, constellation.id),
            ra: constellation.coordinates[0],
            dec: constellation.coordinates[1]
        })
    }

    // Only stars that actually have a proper name are searchable — coordinates come
    // from the star catalog, names from starnames.json
    const starPositions = new Map(input.starPositions.map((position) => [position.id, position]))

    for (const [hipId, entry] of Object.entries(input.starNames)) {
        if (!entry.name && !entry.ru) {
            continue
        }

        const position = starPositions.get(hipId)

        if (!position) {
            continue
        }

        items.push({
            kind: 'star',
            id: hipId,
            name: getStarDisplayName(hipId, input.starNames, language),
            secondary: entry.bayer && entry.c ? `${entry.bayer} ${entry.c}` : entry.hip,
            keywords: toKeywords(
                entry.name,
                entry.ru,
                entry.bayer && entry.c ? `${entry.bayer} ${entry.c}` : undefined
            ),
            ra: position.ra,
            dec: position.dec,
            magnitude: position.mag
        })
    }

    for (const position of input.dsoPositions) {
        const entry = input.dsoNames[position.id]

        items.push({
            kind: 'dso',
            id: position.id,
            name: getDsoDisplayName(position.id, input.dsoNames, language),
            secondary: entry?.name || entry?.ru ? position.id : undefined,
            keywords: toKeywords(entry?.name, entry?.ru, position.id),
            ra: position.ra,
            dec: position.dec,
            magnitude: position.mag
        })
    }

    return items
}

/** Case-insensitive substring match with a light ranking: prefix matches first, then shorter names. */
export const matchSearchItems = (items: SearchItem[], query: string, limit: number = 8): SearchItem[] => {
    const needle = query.trim().toLowerCase()

    if (needle.length < 2) {
        return []
    }

    const matched = items.filter((item) => item.keywords.some((keyword) => keyword.includes(needle)))

    return matched
        .sort((a, b) => {
            const aPrefix = a.keywords.some((keyword) => keyword.startsWith(needle)) ? 0 : 1
            const bPrefix = b.keywords.some((keyword) => keyword.startsWith(needle)) ? 0 : 1

            return aPrefix - bPrefix || a.name.length - b.name.length
        })
        .slice(0, limit)
}
