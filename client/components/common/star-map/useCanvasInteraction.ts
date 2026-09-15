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
import { dsoCatalogFile, findHitPoint } from './utils'

/**
 * A press that travels further than this before release is a drag, not a click. Horizon
 * mode detaches d3-zoom, so the browser synthesizes a `click` at the release point of every
 * look-around drag — without the threshold it would open a random popup or close the open one.
 */
const CLICK_MOVE_TOLERANCE_PX = 4

export interface UseCanvasInteractionOptions {
    /** The #celestial-map element — listeners live here, Celestial re-creates the canvas on rebuilds */
    containerRef: RefObject<HTMLDivElement | null>
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
 *
 * Listeners are attached to the map container, not the canvas: Celestial re-creates the
 * canvas on every rebuild, and the first layout may not have a canvas at all yet (zero
 * width defers display()). Events are acted on only when they come from the canvas, so
 * the overlay controls on top of the map are unaffected.
 */
export const useCanvasInteraction = ({
    containerRef,
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
    const rafRef = useRef<number>(0)

    // Solar-system positions for the selected moment, cached by place + minute: the hover
    // check runs every mouse-move frame and must not re-run the ephemeris each time — and
    // during the time flow the instant changes every frame, while a minute of motion is
    // far below the hit radius.
    const bodiesCacheRef = useRef<{ key: string; bodies: BodyPosition[] }>({ key: '', bodies: [] })

    const getBodies = useCallback((geopos: [number, number], when: Date): BodyPosition[] => {
        const key = `${geopos[0]}_${geopos[1]}_${Math.floor(when.getTime() / 60_000)}`

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

        const dsoFile = dsoCatalogFile(currentSettings)

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
            const currentFile = dsoCatalogFile(settingsRef.current)
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
                currentSettings.dsosShow ? loadDsoCatalog(dsoCatalogFile(currentSettings)) : Promise.resolve([])
            ])

            const hit = findBuiltinHit(x, y, buildHitOptions(stars, dsos))

            if (!hit) {
                hidePopup()
                return
            }

            let info: ObjectInfoData
            let displayName: string

            if (hit.kind === 'sun' || hit.kind === 'moon' || hit.kind === 'planet') {
                displayName = bodyLabels[hit.id] ?? hit.id
                info = computeBodyInfo(hit.id as Body, displayName, geopos, when)
            } else if (hit.kind === 'radiant') {
                const shower = showersRef.current?.find((item) => item.id === hit.id)

                displayName = shower ? getShowerDisplayName(shower, language) : hit.id
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

                displayName = getStarDisplayName(hit.id, names, language)
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

                displayName = getDsoDisplayName(hit.id, names, language)
                info = computeFixedObjectInfo(
                    { kind: 'dso', name: displayName, magnitude: hit.magnitude, ra: hit.ra, dec: hit.dec },
                    geopos,
                    when
                )
            }

            openPendingPopup({ name: displayName, object: '', ra: hit.ra, dec: hit.dec, info, infoDate: when })
        },
        [buildHitOptions, hidePopup, openPendingPopup, resolveDate, settingsRef, showersRef, bodyLabels, language]
    )

    // Canvas mouse/click interaction. Cursor: grab over empty sky (the map pans on drag),
    // grabbing while the button is held, pointer over anything clickable.
    const draggingRef = useRef(false)

    useEffect(() => {
        const container = containerRef.current

        if (!container) {
            return
        }

        const isCanvasEvent = (event: Event): event is Event & { target: HTMLCanvasElement } =>
            event.target instanceof HTMLCanvasElement

        const restingCursor = interactive ? 'grab' : 'default'

        // The canvas that exists right now (there may be none yet — see the hook doc); the
        // handlers below always style the canvas the event actually came from
        const currentCanvas = (): HTMLCanvasElement | undefined => Celestial.context?.canvas

        const canvasNow = currentCanvas()

        if (canvasNow) {
            canvasNow.style.cursor = restingCursor
        }

        // Where the primary button went down, to tell a click from a drag's release
        let pressedAt: { x: number; y: number } | null = null

        const handleMouseMove = (e: MouseEvent) => {
            if (!interactive || !isCanvasEvent(e)) {
                return
            }

            const canvas = e.target

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
            if (!interactive || e.button !== 0 || !isCanvasEvent(e)) {
                return
            }

            pressedAt = { x: e.clientX, y: e.clientY }
            draggingRef.current = true
            e.target.style.cursor = 'grabbing'
        }

        const handleMouseUp = () => {
            if (!draggingRef.current) {
                return
            }

            draggingRef.current = false

            // The next mousemove re-evaluates hover; until then assume empty sky
            const canvas = currentCanvas()

            if (canvas) {
                canvas.style.cursor = restingCursor
            }
        }

        const handleClick = (e: MouseEvent) => {
            if (!interactive || !isCanvasEvent(e)) {
                return
            }

            const moved = pressedAt ? Math.hypot(e.clientX - pressedAt.x, e.clientY - pressedAt.y) : 0

            pressedAt = null

            if (moved > CLICK_MOVE_TOLERANCE_PX) {
                return
            }

            const rect = e.target.getBoundingClientRect()
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

        container.addEventListener('mousemove', handleMouseMove)
        container.addEventListener('mousedown', handleMouseDown)
        container.addEventListener('click', handleClick)
        window.addEventListener('mouseup', handleMouseUp)

        return () => {
            cancelAnimationFrame(rafRef.current)
            draggingRef.current = false

            const canvas = currentCanvas()

            if (canvas) {
                canvas.style.cursor = ''
            }

            container.removeEventListener('mousemove', handleMouseMove)
            container.removeEventListener('mousedown', handleMouseDown)
            container.removeEventListener('click', handleClick)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [
        containerRef,
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
