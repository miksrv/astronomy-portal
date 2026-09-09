import { RefObject, useCallback, useEffect, useRef } from 'react'
import { Body } from 'astronomy-engine'

import {
    CatalogPosition,
    getDsoDisplayName,
    getStarDisplayName,
    loadDsoCatalog,
    loadDsoNames,
    loadStarCatalog,
    loadStarNames
} from './catalogs'
import {
    BuiltinHitOptions,
    filterByMagnitude,
    findBuiltinHit,
    HOVER_DSO_MAG_LIMIT,
    HOVER_STAR_MAG_LIMIT
} from './hitTest'
import { getShowerDisplayName, isShowerActive, MeteorShower } from './meteorShowers'
import { BodyPosition, computeBodyInfo, computeFixedObjectInfo, getBodyPositions, ObjectInfoData } from './objectInfo'
import { SearchItem } from './searchIndex'
import { StarMapObject } from './StarMap'
import { PendingPopup, StarMapSettings } from './types'
import { findHitPoint } from './utils'

export interface UseCanvasInteractionOptions {
    interactive?: boolean
    showSettings?: boolean
    objects?: StarMapObject[]
    settingsRef: RefObject<StarMapSettings>
    showersRef: RefObject<MeteorShower[] | null>
    /** Localized Sun/Moon/planet names keyed by astronomy-engine Body */
    bodyLabels: Record<string, string>
    language?: string
    /** The moment the map is currently computed for (see useCelestialDisplay) */
    resolveDate: () => Date
    hidePopup: () => void
    openPendingPopup: (pending: PendingPopup) => void
}

export interface CanvasInteractionController {
    /** Search result selected (FE-4): center the map and open the right popup */
    selectSearchItem: (item: SearchItem) => void
}

/**
 * Mouse interaction with the Celestial canvas: hover cursor (pointer over anything
 * clickable, grab/grabbing for panning), clicks on the portal's own objects and on
 * d3-celestial's built-in stars/planets/DSOs/radiants (FE-8), and jumping to a search hit.
 */
export const useCanvasInteraction = ({
    interactive,
    showSettings,
    objects,
    settingsRef,
    showersRef,
    bodyLabels,
    language,
    resolveDate,
    hidePopup,
    openPendingPopup
}: UseCanvasInteractionOptions): CanvasInteractionController => {
    // Mirrors for the canvas handlers, registered once per effect run
    const bodyLabelsRef = useRef(bodyLabels)
    bodyLabelsRef.current = bodyLabels
    const languageRef = useRef(language)
    languageRef.current = language

    const rafRef = useRef<number>(0)

    // Solar-system positions for the selected moment, cached by place + instant: the hover
    // check runs every mouse-move frame and must not re-run the ephemeris each time.
    const bodiesCacheRef = useRef<{ key: string; bodies: BodyPosition[] }>({ key: '', bodies: [] })

    const getBodies = useCallback((geopos: [number, number], when: Date): BodyPosition[] => {
        const key = `${geopos[0]}_${geopos[1]}_${when.getTime()}`

        if (bodiesCacheRef.current.key !== key) {
            bodiesCacheRef.current = { key, bodies: getBodyPositions(geopos, when) }
        }

        return bodiesCacheRef.current.bodies
    }, [])

    /** Hit-test options for the built-in layers, from the current settings + moment. */
    const buildHitOptions = useCallback(
        (stars: CatalogPosition[], dsos: CatalogPosition[]): BuiltinHitOptions => {
            const currentSettings = settingsRef.current
            const when = resolveDate()

            return {
                starsVisible: currentSettings.starsShow,
                starsLimit: currentSettings.starsLimit,
                dsosVisible: currentSettings.dsosShow,
                planetsVisible: currentSettings.planetsShow,
                stars,
                dsos,
                bodies: currentSettings.planetsShow ? getBodies(currentSettings.geopos, when) : [],
                radiants:
                    currentSettings.meteorShowersShow && showersRef.current
                        ? showersRef.current.filter((shower) => isShowerActive(shower, when))
                        : []
            }
        },
        [getBodies, resolveDate, settingsRef, showersRef]
    )

    // Bright-object subsets for the per-frame hover check (see HOVER_*_MAG_LIMIT). Filled
    // lazily on the first mouse move over the map — the files are already in the browser's
    // HTTP cache (Celestial fetched them to render), so this is parse cost only. Until they
    // arrive the hover check simply skips that layer; clicks still load the full catalogs.
    const hoverStarsRef = useRef<CatalogPosition[] | null>(null)
    const hoverDsosRef = useRef<{ file: string; items: CatalogPosition[] } | null>(null)
    const hoverLoadingRef = useRef<{ stars: boolean; dsoFile: string | null }>({ stars: false, dsoFile: null })

    const ensureHoverCatalogs = useCallback(() => {
        const currentSettings = settingsRef.current
        const loading = hoverLoadingRef.current

        if (currentSettings.starsShow && !hoverStarsRef.current && !loading.stars) {
            loading.stars = true

            void loadStarCatalog().then((stars) => {
                hoverStarsRef.current = filterByMagnitude(stars, HOVER_STAR_MAG_LIMIT)
            })
        }

        const dsoFile = currentSettings.dsosFull ? 'dsos.6.json' : 'dsos.bright.json'

        if (currentSettings.dsosShow && hoverDsosRef.current?.file !== dsoFile && loading.dsoFile !== dsoFile) {
            loading.dsoFile = dsoFile

            void loadDsoCatalog(dsoFile).then((dsos) => {
                hoverDsosRef.current = { file: dsoFile, items: filterByMagnitude(dsos, HOVER_DSO_MAG_LIMIT) }
            })
        }
    }, [settingsRef])

    /** Synchronous, cheap variant of the built-in hit-test for the hover cursor. */
    const findHoverHit = useCallback(
        (x: number, y: number) => {
            const currentFile = settingsRef.current.dsosFull ? 'dsos.6.json' : 'dsos.bright.json'
            const dsos = hoverDsosRef.current?.file === currentFile ? hoverDsosRef.current.items : []

            return findBuiltinHit(x, y, buildHitOptions(hoverStarsRef.current ?? [], dsos))
        },
        [buildHitOptions, settingsRef]
    )

    /** Click on one of d3-celestial's built-in objects → astronomy info panel (FE-8) */
    const handleBuiltinClick = useCallback(
        async (x: number, y: number) => {
            const currentSettings = settingsRef.current
            const when = resolveDate()
            const geopos = currentSettings.geopos

            // Positions of what's actually rendered (browser-cached — the map already
            // downloaded the same files); empty arrays when the layer is off.
            const [stars, dsos] = await Promise.all([
                currentSettings.starsShow ? loadStarCatalog() : Promise.resolve([]),
                currentSettings.dsosShow
                    ? loadDsoCatalog(currentSettings.dsosFull ? 'dsos.6.json' : 'dsos.bright.json')
                    : Promise.resolve([])
            ])

            const hit = findBuiltinHit(x, y, buildHitOptions(stars, dsos))

            if (!hit) {
                hidePopup()
                return
            }

            let info: ObjectInfoData
            let displayName: string

            if (hit.kind === 'sun' || hit.kind === 'moon' || hit.kind === 'planet') {
                displayName = bodyLabelsRef.current[hit.id] ?? hit.id
                info = computeBodyInfo(hit.id as Body, displayName, geopos, when)
            } else if (hit.kind === 'radiant') {
                const shower = showersRef.current?.find((item) => item.id === hit.id)

                displayName = shower ? getShowerDisplayName(shower, languageRef.current) : hit.id
                info = {
                    ...computeFixedObjectInfo(
                        { kind: 'radiant', name: displayName, designation: hit.id, ra: hit.ra, dec: hit.dec },
                        geopos,
                        when
                    ),
                    peak: shower?.peak,
                    activeFrom: shower?.activeFrom,
                    activeTo: shower?.activeTo,
                    isActive: shower ? isShowerActive(shower, when) : undefined
                }
            } else if (hit.kind === 'star') {
                const names = await loadStarNames()

                displayName = getStarDisplayName(hit.id, names, languageRef.current)
                info = computeFixedObjectInfo(
                    {
                        kind: 'star',
                        name: displayName,
                        designation: `HIP ${hit.id}`,
                        magnitude: hit.magnitude,
                        ra: hit.ra,
                        dec: hit.dec
                    },
                    geopos,
                    when
                )
            } else {
                const names = await loadDsoNames()

                displayName = getDsoDisplayName(hit.id, names, languageRef.current)
                info = computeFixedObjectInfo(
                    { kind: 'dso', name: displayName, magnitude: hit.magnitude, ra: hit.ra, dec: hit.dec },
                    geopos,
                    when
                )
            }

            openPendingPopup({ name: displayName, object: '', ra: hit.ra, dec: hit.dec, info, infoDate: when })
        },
        [buildHitOptions, hidePopup, openPendingPopup, resolveDate, settingsRef, showersRef]
    )

    // Canvas mouse/click interaction. Cursor: grab over empty sky (the map pans on drag),
    // grabbing while the button is held, pointer over anything clickable.
    const draggingRef = useRef(false)

    useEffect(() => {
        const canvas: HTMLCanvasElement | undefined = Celestial.context?.canvas
        if (!canvas) {
            return
        }

        canvas.style.cursor = interactive ? 'grab' : 'default'

        const handleMouseMove = (e: MouseEvent) => {
            if (!interactive) {
                return
            }

            cancelAnimationFrame(rafRef.current)
            rafRef.current = requestAnimationFrame(() => {
                if (draggingRef.current) {
                    return
                }

                const rect = canvas.getBoundingClientRect()
                const x = e.clientX - rect.left
                const y = e.clientY - rect.top

                let hasHit = Boolean(findHitPoint(x, y))

                if (!hasHit && showSettings) {
                    ensureHoverCatalogs()
                    hasHit = Boolean(findHoverHit(x, y))
                }

                canvas.style.cursor = hasHit ? 'pointer' : 'grab'
            })
        }

        // d3's zoom behaviour listens for mousedown on the canvas but finishes the drag
        // on window-level mouseup (the pointer may leave the canvas mid-drag), so the
        // release is tracked on window too.
        const handleMouseDown = (e: MouseEvent) => {
            if (!interactive || e.button !== 0) {
                return
            }

            draggingRef.current = true
            canvas.style.cursor = 'grabbing'
        }

        const handleMouseUp = () => {
            if (!draggingRef.current) {
                return
            }

            draggingRef.current = false
            // The next mousemove re-evaluates hover; until then assume empty sky
            canvas.style.cursor = interactive ? 'grab' : 'default'
        }

        const handleClick = (e: MouseEvent) => {
            if (!interactive) {
                return
            }

            const rect = canvas.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            const hit = findHitPoint(x, y)

            if (hit) {
                const [ra, dec] = hit.point.geometry.coordinates

                openPendingPopup({
                    name: hit.point.properties.name,
                    object: hit.point.id,
                    ra: Number(ra),
                    dec: Number(dec)
                })
            } else if (showSettings) {
                void handleBuiltinClick(x, y)
            } else {
                hidePopup()
            }
        }

        canvas.addEventListener('mousemove', handleMouseMove)
        canvas.addEventListener('mousedown', handleMouseDown)
        canvas.addEventListener('click', handleClick)
        window.addEventListener('mouseup', handleMouseUp)

        return () => {
            cancelAnimationFrame(rafRef.current)
            draggingRef.current = false
            canvas.style.cursor = ''
            canvas.removeEventListener('mousemove', handleMouseMove)
            canvas.removeEventListener('mousedown', handleMouseDown)
            canvas.removeEventListener('click', handleClick)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [
        objects,
        interactive,
        showSettings,
        ensureHoverCatalogs,
        findHoverHit,
        handleBuiltinClick,
        hidePopup,
        openPendingPopup
    ])

    /** Search result selected (FE-4): center the map and open the right popup */
    const selectSearchItem = useCallback(
        (item: SearchItem) => {
            const when = resolveDate()
            const geopos = settingsRef.current.geopos

            if (item.kind === 'sun' || item.kind === 'moon' || item.kind === 'planet') {
                const info = computeBodyInfo(item.id as Body, item.name, geopos, when)

                openPendingPopup({ name: item.name, object: '', ra: info.ra, dec: info.dec, info, infoDate: when })
                return
            }

            if (item.ra === undefined || item.dec === undefined) {
                return
            }

            if (item.kind === 'portal') {
                openPendingPopup({ name: item.name, object: item.id, ra: item.ra, dec: item.dec })
                return
            }

            if (item.kind === 'constellation') {
                // Horizon mode is locked to the zenith — re-centering on the constellation
                // would tip the whole dome over (the ground with it), so the hit is simply
                // ignored there: the dome already shows the entire visible sky.
                if (settingsRef.current.viewMode === 'sky') {
                    Celestial.rotate({ center: [item.ra, item.dec, 0] })
                }

                return
            }

            const info = computeFixedObjectInfo(
                {
                    kind: item.kind === 'star' ? 'star' : 'dso',
                    name: item.name,
                    designation: item.secondary,
                    magnitude: item.magnitude,
                    ra: item.ra,
                    dec: item.dec
                },
                geopos,
                when
            )

            openPendingPopup({ name: item.name, object: '', ra: item.ra, dec: item.dec, info, infoDate: when })
        },
        [openPendingPopup, resolveDate, settingsRef]
    )

    return { selectSearchItem }
}
