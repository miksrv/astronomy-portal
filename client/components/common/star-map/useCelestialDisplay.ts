import { RefObject, useCallback, useEffect, useMemo, useRef } from 'react'

import { customConfig, defaultConfig } from './config'
import { LIVE_TICK_HIDE_GRACE_MS, ZOOM_STEP_IN, ZOOM_STEP_OUT } from './constants'
import { detachCelestialZoom, MAX_VIEW_RESTORE_ATTEMPTS } from './horizonNavigation'
import { fitHorizonToView, ViewportSize } from './horizonOverlay'
import { centerMatches, DOME_VIEW, HorizonView, isDomeView, viewToCenter } from './horizonView'
import { horizontalToEquatorial } from './objectInfo'
import { StarMapObject, StarMapProps } from './StarMap'
import { StarMapSettings } from './types'
import { useLiveClock } from './useLiveClock'
import {
    buildLiveSettingsPatch,
    buildSkyviewPatch,
    buildVisualConfig,
    computeHorizonCanvasLayout,
    computeHorizonCoverZoom,
    computeHorizonStartZoom,
    createObjectsJSON
} from './utils'

/** Current zoom factor relative to the config's base zoomlevel (Celestial.zoomBy() getter), or null. */
const readZoomFactor = (): number | null => {
    try {
        const factor = Celestial.zoomBy?.()

        return typeof factor === 'number' && Number.isFinite(factor) && factor > 0 ? factor : null
    } catch {
        return null
    }
}

/**
 * Run zoom/rotate calls with Celestial's transitions switched off. `disableAnimations`
 * is one of Celestial's own config flags (honoured by zoomBy/rotate), so it can be toggled
 * through the public apply() API — each apply() redraws once, which is fine for the
 * one-off resize path this is used on.
 *
 * `keepDisabled` is what the flag is restored to: horizon mode runs with animations off
 * permanently (buildVisualConfig), so restoring `false` there would quietly re-enable them.
 */
const withoutAnimations = (run: () => void, keepDisabled = false): void => {
    try {
        Celestial.apply({ disableAnimations: true })
        run()
    } catch (error) {
        console.warn(error)
    } finally {
        try {
            Celestial.apply({ disableAnimations: keepDisabled })
        } catch (error) {
            console.warn(error)
        }
    }
}

export interface UseCelestialDisplayOptions {
    containerRef: RefObject<HTMLDivElement | null>
    objects?: StarMapObject[]
    zoom?: number
    config?: StarMapProps['config']
    language?: string
    showSettings?: boolean
    fitContainer?: boolean
    settings: StarMapSettings
    settingsRef: RefObject<StarMapSettings>
    centerRef: RefObject<[number, number, number]>
    /** Horizon mode: the direction the visitor is looking — see useHorizonNavigation */
    viewRef: RefObject<HorizonView>
    permalinkZoomRef: RefObject<number | null>
    date: Date | null
    dateRef: RefObject<Date | null>
    /** Popup auto-hide hook, called at the very end of every Celestial redraw */
    onRedraw: () => void
    /** Clears the popup's show/hide timers when the display effect tears down */
    clearPopupTimers: () => void
    /** Keeps the popup's auto-hide suppressed until the given timestamp (ms) */
    extendAutoHideGrace: (until: number) => void
}

export interface CelestialDisplayController {
    /** True once Celestial.display() has run and the addCallback is registered */
    initializedRef: RefObject<boolean>
    /**
     * "Now" captured when the map is (re)computed — keeps redraw-time astronomy stable
     * between skyview updates instead of drifting every animation frame
     */
    nowRef: RefObject<Date>
    /** The moment the map is currently computed for: the selected date, else the captured "now" */
    resolveDate: () => Date
    /**
     * Drawn from Celestial's end-of-redraw callback (registered once); assign the current
     * custom-layer drawer here every render (see useCustomLayers).
     */
    drawCustomLayersRef: RefObject<() => void>
    /** Toolbar rail: zoom by the same step Celestial's built-in +/− controls use */
    zoomIn: () => void
    zoomOut: () => void
    /** Zoom by an arbitrary factor — the horizon-mode wheel/pinch gestures */
    zoomBy: (factor: number) => void
    /** Horizon mode: point the map at `viewRef` (center + level roll) */
    applyHorizonView: () => void
    /** Horizon mode: degrees of sky per pixel at the view center, or null if unavailable */
    measureViewScale: () => number | null
    /** Horizon mode: zoom in far enough that a look-around view fills the frame */
    ensureLookAroundZoom: () => void
    /**
     * Toolbar rail "fit view": horizon mode re-centers on the zenith and fits the whole
     * dome into the canvas (same as after the first display); sky mode resets the zoom to
     * the config's base level and leaves the user's center alone.
     */
    fitView: () => void
}

/**
 * Owns the Celestial instance lifecycle: initial display and full rebuilds, fitting to the
 * container, live-patching settings via Celestial.apply(), date/location updates via
 * Celestial.skyview(), and the once-a-minute "now" tick.
 */
export const useCelestialDisplay = ({
    containerRef,
    objects,
    zoom,
    config,
    language,
    showSettings,
    fitContainer,
    settings,
    settingsRef,
    centerRef,
    viewRef,
    permalinkZoomRef,
    date,
    dateRef,
    onRedraw,
    clearPopupTimers,
    extendAutoHideGrace
}: UseCelestialDisplayOptions): CelestialDisplayController => {
    // "Now" captured when the map is (re)computed — keeps redraw-time astronomy stable
    // between skyview updates instead of drifting every animation frame
    const nowRef = useRef<Date>(new Date())

    const resolveDate = useCallback((): Date => dateRef.current ?? nowRef.current, [dateRef])

    const objectsJSON = useMemo(() => createObjectsJSON(objects), [objects])

    const handleCallback = (error: unknown) => {
        if (error) {
            console.warn(error)
            return null
        }

        if (objectsJSON) {
            const skyPoint = Celestial.getData(objectsJSON, defaultConfig.transform)

            Celestial.container
                .selectAll('.sky-points')
                .data(skyPoint.features)
                .enter()
                .append('path')
                .attr('class', 'sky-points')
        }

        Celestial.redraw()
    }

    // Kept in a ref so the addCallback closure (registered once) always draws with
    // the current props/objects. Filled by useCustomLayers on every render.
    const drawCustomLayersRef = useRef<() => void>(() => undefined)

    const initializedRef = useRef<boolean>(false)
    // Last container size seen by the fitContainer ResizeObserver — avoids redundant
    // resize()/fit calls on ticks that didn't change anything.
    const lastFitWidthRef = useRef<number>(0)
    const lastFitHeightRef = useRef<number>(0)

    // The visible area the user actually sees — the canvas may be larger than this in
    // fitContainer mode (it spans the full width and .starMapFit crops the overflow), so
    // anything that "fits" the view must measure the container, not the canvas.
    const readViewport = useCallback((): ViewportSize | undefined => {
        const container = containerRef.current

        if (!fitContainer || !container || container.offsetWidth <= 0 || container.offsetHeight <= 0) {
            return undefined
        }

        return { width: container.offsetWidth, height: container.offsetHeight }
    }, [fitContainer, containerRef])

    // Sky mode on a portrait screen (mobile): mercator's fixed aspect ratio leaves the
    // canvas as a letterboxed band in the middle of the viewport — widen it until its
    // projected height covers the container (the extra width is centered and cropped by
    // .starMapFit's CSS), so the sky fills the screen and the whole visible area stays
    // interactive. No-op on landscape, where the canvas already overflows vertically.
    // Horizon mode covers the container through background padding instead — see
    // computeHorizonCanvasLayout — so it is excluded here.
    const fillContainerHeight = useCallback(() => {
        if (!fitContainer || settingsRef.current.viewMode !== 'sky' || !containerRef.current) {
            return
        }

        const canvas: HTMLCanvasElement | undefined = Celestial.context?.canvas
        const canvasRect = canvas?.getBoundingClientRect()
        const containerHeight = containerRef.current.offsetHeight

        if (
            canvasRect &&
            canvasRect.width > 0 &&
            canvasRect.height > 0 &&
            containerHeight > 1 &&
            canvasRect.height < containerHeight - 1
        ) {
            Celestial.resize({ width: Math.ceil(canvasRect.width * (containerHeight / canvasRect.height)) })
        }
    }, [fitContainer, settingsRef, containerRef])

    /**
     * Point the map where the visitor is looking. Horizon mode never lets Celestial choose
     * the center: `viewToCenter` turns the azimuth/altitude into an equatorial center plus
     * the roll that keeps the zenith straight up — which is what keeps the horizon
     * horizontal and the ground at the bottom (see horizonView.ts).
     */
    const applyHorizonView = useCallback(() => {
        if (settingsRef.current.viewMode !== 'horizon') {
            return
        }

        try {
            Celestial.rotate({
                center: viewToCenter(viewRef.current, settingsRef.current.geopos, dateRef.current ?? nowRef.current)
            })
        } catch (error) {
            console.warn(error)
        }
    }, [settingsRef, dateRef, viewRef])

    /**
     * Degrees of sky per pixel across the view center — the drag scale, so a look-around
     * gesture moves the sky with the pointer at any zoom level. Measured on the live
     * projection (one degree of altitude below the center, which is always inside the map:
     * MIN_VIEW_ALTITUDE keeps the view at least a degree above the horizon).
     */
    const measureViewScale = useCallback((): number | null => {
        if (!initializedRef.current || settingsRef.current.viewMode !== 'horizon') {
            return null
        }

        const view = viewRef.current
        const geopos = settingsRef.current.geopos
        const when = dateRef.current ?? nowRef.current

        try {
            const center = Celestial.mapProjection(horizontalToEquatorial(view.azimuth, view.altitude, geopos, when))
            const below = Celestial.mapProjection(horizontalToEquatorial(view.azimuth, view.altitude - 1, geopos, when))

            if (!center || !below) {
                return null
            }

            const pixels = Math.hypot(center[0] - below[0], center[1] - below[1])

            return pixels > 0.5 ? 1 / pixels : null
        } catch (error) {
            console.warn(error)
            return null
        }
    }, [settingsRef, dateRef, viewRef])

    /**
     * How far horizon mode may be zoomed *out*, as a Celestial zoom factor — the floor the
     * wheel, the pinch and the toolbar's "−" are clamped to, so the sky is never a bubble
     * with dead space around it.
     *
     * The airy projection's visible disc is exactly the projection width at zoom factor 1
     * (that is what computeHorizonCanvasLayout sizes), and every projected distance scales
     * linearly with the factor — so the disc's radius on screen is
     * `(projectionWidth / 2) * factor`, no measuring needed. Two floors follow from that:
     *
     * - the whole-sky dome fits the frame at factor 1, which is also Celestial's own
     *   minimum — nothing to add;
     * - a look-around is centered on a direction, not the zenith, so the whole disc sits in
     *   the frame instead of surrounding it: there the sky has to *cover* the viewport, i.e.
     *   the disc's radius must reach the frame's corner.
     */
    const horizonMinZoomFactor = useCallback((): number => {
        const viewport = readViewport()

        // Non-fitContainer embeds size the canvas themselves — no floor beyond Celestial's
        if (!viewport || viewport.width <= 0 || viewport.height <= 0 || isDomeView(viewRef.current)) {
            return 1
        }

        return computeHorizonCoverZoom(viewport.width, viewport.height)
    }, [readViewport, viewRef])

    /**
     * The zoom the mode opens with: the cover floor tightened by INITIAL_HORIZON_ZOOM (the
     * knob for "how close does /starmap start"). Applied once per display() — a rebuild
     * drops back to the projection's base scale, so something has to set it — and only for
     * a look-around; the whole-sky dome opens at the fitted base scale instead.
     */
    const applyStartupZoom = useCallback(() => {
        const viewport = readViewport()

        if (!viewport || isDomeView(viewRef.current)) {
            return
        }

        try {
            const current = readZoomFactor()
            const target = computeHorizonStartZoom(viewport.width, viewport.height)

            if (current != null && Math.abs(target / current - 1) > 0.001) {
                Celestial.zoomBy(target / current)
            }
        } catch (error) {
            console.warn(error)
        }
    }, [readViewport, viewRef])

    /**
     * Leaving the whole-sky dome for a look-around: make sure the sky covers the frame.
     *
     * The dome zoom is chosen so the entire 90°-radius hemisphere fits *inside* the
     * viewport (that is the point of the dome view). Looked at from the side, that same
     * scale leaves the sky sitting in the middle of the canvas as a bubble, with the
     * projection's clip edge in plain sight — so the view is zoomed up to the look-around
     * floor (horizonMinZoomFactor). It only ever zooms in; a visitor already above the
     * floor is left alone.
     */
    const ensureLookAroundZoom = useCallback(() => {
        if (settingsRef.current.viewMode !== 'horizon') {
            return
        }

        try {
            const current = readZoomFactor()
            const minimum = horizonMinZoomFactor()

            if (current != null && current < minimum) {
                Celestial.zoomBy(minimum / current)
            }
        } catch (error) {
            console.warn(error)
        }
    }, [settingsRef, horizonMinZoomFactor])

    // At most one restore in flight, plus a bail-out counter — see
    // MAX_VIEW_RESTORE_ATTEMPTS for why a plain time-based cooldown is not enough.
    const viewRestorePendingRef = useRef<boolean>(false)
    const viewRestoreAttemptsRef = useRef<number>(0)

    // Safety net for anything that re-centers the map behind our back — Celestial's own
    // zenith follow-up after display(), a projection rebuild, a stray rotate. Horizon mode
    // has exactly one valid center at any moment, so a redraw that shows a different one is
    // put back. rotate() redraws, so it must not be called from inside a redraw: the restore
    // is deferred to the next task, the redraw it causes finds the center already in place,
    // and the check settles. The counter bounds the (never observed) case of Celestial
    // insisting on a center of its own.
    const restoreHorizonView = useCallback(() => {
        if (settingsRef.current.viewMode !== 'horizon' || viewRestorePendingRef.current) {
            return
        }

        const current = Celestial.rotate?.() as [number, number, number] | undefined

        if (!current) {
            return
        }

        const wanted = viewToCenter(viewRef.current, settingsRef.current.geopos, dateRef.current ?? nowRef.current)

        if (centerMatches(current, wanted)) {
            // Pointed where it should be — the mechanism works, reset the bail-out
            viewRestoreAttemptsRef.current = 0
            return
        }

        if (viewRestoreAttemptsRef.current >= MAX_VIEW_RESTORE_ATTEMPTS) {
            return
        }

        viewRestoreAttemptsRef.current += 1
        viewRestorePendingRef.current = true

        setTimeout(() => {
            viewRestorePendingRef.current = false
            applyHorizonView()
        }, 0)
    }, [settingsRef, dateRef, viewRef, applyHorizonView])

    // Single combined effect: initialise Celestial and (re-)display with objects.
    // viewMode and dsosFull changes rebuild the map: they change the projection/follow
    // target and the DSO data file — things Celestial.apply() can't live-patch.
    useEffect(() => {
        const ref = containerRef

        const localConfig = {
            ...customConfig,
            ...config,
            zoomlevel: zoom || customConfig.zoomlevel,
            lang: language || customConfig.lang
        }

        // Apply user settings (initial snapshot) when the settings panel is enabled.
        // Later toggles are applied live via Celestial.apply() — see the effect below —
        // so this branch only runs again on mount or when objects/zoom/language change.
        if (showSettings) {
            Object.assign(localConfig, buildVisualConfig(settingsRef.current))

            if (settingsRef.current.viewMode === 'sky') {
                localConfig.center = centerRef.current
                localConfig.follow = [centerRef.current[0], centerRef.current[1]]
            } else {
                // Horizon mode points itself: the config center is the visitor's view
                // direction (the whole-sky dome unless a permalink says otherwise)
                localConfig.center = viewToCenter(
                    viewRef.current,
                    settingsRef.current.geopos,
                    dateRef.current ?? new Date()
                )
            }
        }

        const initCelestial = () => {
            if (ref.current) {
                localConfig.width = ref.current.offsetWidth
            }

            if (localConfig.width <= 0 && ref.current) {
                return false
            }

            // Horizon mode: the dome's diameter is the container's smaller side (Celestial
            // cannot zoom out below the projection's base scale, so the dome must already
            // fit), and background padding grows the canvas to the larger side so the map
            // covers the whole container instead of sitting in a square in the middle.
            // .starMapFit centers the canvas and crops the overflow symmetrically.
            if (showSettings && settingsRef.current.viewMode === 'horizon' && ref.current) {
                const layout = computeHorizonCanvasLayout(localConfig.width, ref.current.offsetHeight)

                localConfig.width = layout.width
                localConfig.background = { ...localConfig.background, width: layout.backgroundWidth }
            }

            // Remember the container size, so the ResizeObserver below skips ticks that
            // didn't change it.
            if (fitContainer && ref.current) {
                lastFitWidthRef.current = ref.current.offsetWidth
                lastFitHeightRef.current = ref.current.offsetHeight
            }

            // For non-settings mode (object detail pages), center on the single object
            const singleObject = !showSettings && objects?.length === 1 ? objects[0] : undefined

            if (singleObject) {
                localConfig.follow = [singleObject.ra || 0, singleObject.dec || 0]
                localConfig.center = [singleObject.ra || 0, singleObject.dec || 0, 1]
            }

            Celestial.clear()

            // The layer registration only matters for its load callback (it binds the
            // portal objects' GeoJSON into Celestial.container for hit-testing) — the
            // actual drawing happens in drawCustomLayers via addCallback below, at the
            // END of Celestial's redraw cycle (its own layer-redraw hook runs before the
            // daylight/horizon fills, which would paint over everything in horizon mode).
            if (objects?.length || showSettings) {
                Celestial.add(
                    {
                        callback: handleCallback,
                        redraw: () => undefined,
                        type: 'Point'
                    },
                    objectsJSON ? [objectsJSON] : []
                )
            }

            nowRef.current = new Date()
            Celestial.display(localConfig)

            // Fill portrait screens with sky instead of a letterboxed band (no-op on
            // landscape/desktop, where the canvas already overflows the container)
            fillContainerHeight()

            // Re-apply the selected moment after a rebuild — Celestial.display always
            // starts at "now" (safe here: location:true guarantees the hidden form exists)
            if (showSettings && dateRef.current) {
                try {
                    Celestial.skyview(buildSkyviewPatch(dateRef.current))
                } catch (error) {
                    console.warn(error)
                }
            }

            if (showSettings && settingsRef.current.viewMode === 'horizon') {
                try {
                    // Fit the whole horizon circle (plus label margin) into the visible
                    // area — only meaningful for the whole-sky view; a permalink that shares
                    // a look-around direction brings its own zoom instead
                    if (isDomeView(viewRef.current)) {
                        fitHorizonToView(settingsRef.current.geopos, dateRef.current ?? new Date(), readViewport())
                    } else if (!permalinkZoomRef.current) {
                        // A look-around with no zoom of its own (the opening view, or a
                        // permalink that only shares a direction): open at the startup zoom
                        // rather than leaving the sky as a bubble in the middle
                        applyStartupZoom()
                    }

                    // skyview() above re-read the date and redrew — point the map back at
                    // the visitor's direction for that instant
                    applyHorizonView()

                    // Take over navigation: Celestial re-attaches its free equatorial
                    // trackball on every display(), and it would drag the zenith off the
                    // center of the view — see horizonNavigation.ts / useHorizonNavigation.
                    const canvas: HTMLCanvasElement | undefined = Celestial.context?.canvas

                    if (canvas) {
                        detachCelestialZoom(canvas)
                    }
                } catch (error) {
                    console.warn(error)
                }
            }

            // Restore the permalink's zoom once, after the first display
            if (permalinkZoomRef.current) {
                try {
                    const current = Celestial.zoomBy?.()

                    if (typeof current === 'number' && current > 0) {
                        Celestial.zoomBy(permalinkZoomRef.current / current)
                    }
                } catch (error) {
                    console.warn(error)
                }

                permalinkZoomRef.current = null
            }

            if (!initializedRef.current) {
                initializedRef.current = true
                Celestial.addCallback(() => {
                    // Runs at the very end of every Celestial redraw — the only spot
                    // where custom drawing lands on top of the daylight/horizon fills
                    drawCustomLayersRef.current()

                    restoreHorizonView()
                    onRedraw()
                })
            }

            return true
        }

        if (!initCelestial()) {
            const frameId = requestAnimationFrame(() => {
                initCelestial()
            })

            return () => {
                cancelAnimationFrame(frameId)
                clearPopupTimers()
            }
        }

        return () => {
            clearPopupTimers()
        }
    }, [objects, zoom, language, settings.viewMode, settings.dsosFull])

    // Keep the map fitted to its container on resize. Celestial has its own window-resize
    // listener, but it's a no-op once an explicit numeric width has been set (its getWidth()
    // just echoes back cfg.width), so fitContainer mode has to drive resizing itself via the
    // public Celestial.resize() API.
    useEffect(() => {
        if (!fitContainer || !containerRef.current) {
            return
        }

        const container = containerRef.current

        const handleResize = () => {
            if (!initializedRef.current) {
                return
            }

            const width = container.offsetWidth
            const height = container.offsetHeight
            const horizonMode = showSettings && settingsRef.current.viewMode === 'horizon'

            if (width <= 0 || height <= 0) {
                return
            }

            const widthChanged = Math.round(width) !== Math.round(lastFitWidthRef.current)
            const heightChanged = Math.round(height) !== Math.round(lastFitHeightRef.current)

            if (!widthChanged && !heightChanged) {
                return
            }

            lastFitWidthRef.current = width
            lastFitHeightRef.current = height

            // Horizon mode: both sides matter (dome = smaller side, padding = the rest),
            // so any size change re-lays the canvas out — see computeHorizonCanvasLayout.
            // The padding goes through apply() (a one-level merge into `background`), the
            // projection width through resize(); each redraws once, then the view is
            // restored without the zoom animation.
            if (horizonMode) {
                const layout = computeHorizonCanvasLayout(width, height)
                const zoomFactor = readZoomFactor()

                withoutAnimations(() => {
                    Celestial.apply({ background: { width: layout.backgroundWidth } })
                    Celestial.resize({ width: layout.width })

                    if (isDomeView(viewRef.current)) {
                        // Whole-sky view: re-fit the dome to the new area
                        fitHorizonToView(settingsRef.current.geopos, dateRef.current ?? new Date(), readViewport())
                    } else if (zoomFactor != null) {
                        // Looking around: resize() drops back to the base zoom level, so the
                        // visitor's own zoom is measured before and re-applied after
                        const current = readZoomFactor()

                        if (current != null && Math.abs(zoomFactor / current - 1) > 0.001) {
                            Celestial.zoomBy(zoomFactor / current)
                        }
                    }

                    // resize() rebuilds the projection from the config center — re-assert
                    // the view direction and its roll
                    applyHorizonView()
                }, true)

                return
            }

            // Sky mode: a height-only change (cookie banner closing, browser chrome) leaves
            // the canvas width alone — only portrait screens need re-filling.
            if (!widthChanged) {
                fillContainerHeight()
                return
            }

            // Celestial.resize() rebuilds the projection at the config's base zoomlevel,
            // discarding the current zoom. A resize now also happens on every settings-
            // sidebar toggle (the docked sidebar changes the map's width), so the view
            // must survive it: sky mode restores the user's zoom factor, horizon mode
            // re-fits the dome to the new area. Both without the zoom animation — a
            // sidebar toggle should feel like a reflow, not a 1–2 s zoom flight.
            const zoomFactor = readZoomFactor()

            Celestial.resize({ width })
            fillContainerHeight()

            withoutAnimations(() => {
                if (zoomFactor != null && Math.abs(zoomFactor - 1) > 0.001) {
                    Celestial.zoomBy(zoomFactor)
                }
            })
        }

        const observer = new ResizeObserver(handleResize)
        observer.observe(container)

        return () => observer.disconnect()
    }, [fitContainer, fillContainerHeight, readViewport])

    // Apply settings-panel toggles live via Celestial.apply(), which merges the partial
    // config and redraws in place — no Celestial.clear()/display() rebuild, so the map
    // doesn't blink on every checkbox change. The initial snapshot is already applied by
    // the mount pass of the effect above, so only a *changed* settings object is patched:
    // comparing against the last applied snapshot (instead of a "skip the first run" flag)
    // keeps React StrictMode's double-invoked mount effect a no-op in dev.
    const appliedSettingsRef = useRef(settings)
    useEffect(() => {
        if (!showSettings || appliedSettingsRef.current === settings) {
            return
        }

        appliedSettingsRef.current = settings
        Celestial.apply(buildLiveSettingsPatch(settings))
    }, [showSettings, settings])

    // Live date/location updates (FE-2): patch the running map via Celestial.skyview()
    // instead of rebuilding it. The initial values are already in the display config.
    // Same StrictMode-safe principle as the settings patch above: remember the last
    // applied place+moment key (seeded with the mount values, which display() already
    // used) and only call skyview() when it actually changes.
    const [observerLat, observerLon] = settings.geopos
    const skyviewKey = `${observerLat}_${observerLon}_${date?.getTime() ?? 'now'}`
    const appliedSkyviewKeyRef = useRef(skyviewKey)
    useEffect(() => {
        if (!showSettings || !initializedRef.current || appliedSkyviewKeyRef.current === skyviewKey) {
            return
        }

        appliedSkyviewKeyRef.current = skyviewKey
        nowRef.current = new Date()

        try {
            Celestial.skyview(buildSkyviewPatch(date ?? nowRef.current, [observerLat, observerLon]))
            // The visitor keeps looking the same way; where that points in the sky doesn't
            applyHorizonView()
        } catch (error) {
            console.warn(error)
        }
    }, [showSettings, observerLat, observerLon, date, applyHorizonView])

    // "Now" mode keeps up with real time: once a minute advance nowRef and hand the new
    // instant to Celestial. Date-only skyview() leaves the location alone and just redraws
    // (the visitor's center is untouched); horizon mode then re-points the map, because the
    // equatorial direction of a fixed azimuth/altitude drifts with the sky. Sun/Moon/planet
    // hit-testing and the horizon overlay key their caches by the instant, so they refresh
    // on their own.
    const handleLiveTick = useCallback(() => {
        if (!initializedRef.current || dateRef.current) {
            return
        }

        nowRef.current = new Date()

        // The redraw(s) this triggers would otherwise arm the popup's auto-hide timer in
        // the addCallback — an open info panel must not vanish by itself once a minute.
        // The grace covers horizon mode's short zenith-follow rotation as well.
        extendAutoHideGrace(Date.now() + LIVE_TICK_HIDE_GRACE_MS)

        try {
            Celestial.skyview(buildSkyviewPatch(nowRef.current))
            applyHorizonView()
        } catch (error) {
            console.warn(error)
        }
    }, [dateRef, extendAutoHideGrace, applyHorizonView])

    useLiveClock(Boolean(showSettings) && date == null, handleLiveTick)

    // Every zoom gesture funnels through here — the toolbar's +/−, the wheel and the
    // pinch — so horizon mode's zoom-out floor (horizonMinZoomFactor) is enforced in one
    // place. A zoom-out that would take the sky below the floor is shortened to land
    // exactly on it; one made from below the floor (a resize can leave the view there) is
    // dropped rather than turned into a surprise zoom-in.
    const zoomBy = useCallback(
        (factor: number) => {
            if (!initializedRef.current) {
                return
            }

            let applied = factor

            if (showSettings && settingsRef.current.viewMode === 'horizon' && factor < 1) {
                const current = readZoomFactor()

                if (current != null) {
                    applied = Math.max(factor, Math.min(1, horizonMinZoomFactor() / current))
                }
            }

            if (Math.abs(applied - 1) < 0.001) {
                return
            }

            try {
                Celestial.zoomBy(applied)
            } catch (error) {
                console.warn(error)
            }
        },
        [showSettings, settingsRef, horizonMinZoomFactor]
    )

    const zoomIn = useCallback(() => zoomBy(ZOOM_STEP_IN), [zoomBy])
    const zoomOut = useCallback(() => zoomBy(ZOOM_STEP_OUT), [zoomBy])

    // Both branches run without Celestial's transitions: fitHorizonToView measures the
    // projection synchronously right after rotate(), so an animated rotate would make it
    // read a half-way frame; the sky-mode zoom reset is instant for consistency.
    const fitView = useCallback(() => {
        if (!initializedRef.current) {
            return
        }

        const current = settingsRef.current
        const when = dateRef.current ?? new Date()

        if (current.viewMode === 'horizon') {
            // Also the way back out of a look-around: straight up, whole sky, north up
            viewRef.current = DOME_VIEW

            withoutAnimations(() => {
                Celestial.rotate({ center: viewToCenter(DOME_VIEW, current.geopos, when) })
                fitHorizonToView(current.geopos, when, readViewport())
            }, true)

            return
        }

        withoutAnimations(() => {
            const zoomFactor = readZoomFactor()

            if (zoomFactor != null && Math.abs(zoomFactor - 1) > 0.001) {
                Celestial.zoomBy(1 / zoomFactor)
            }
        })
    }, [settingsRef, dateRef, viewRef, readViewport])

    return {
        initializedRef,
        nowRef,
        resolveDate,
        drawCustomLayersRef,
        zoomIn,
        zoomOut,
        zoomBy,
        applyHorizonView,
        measureViewScale,
        ensureLookAroundZoom,
        fitView
    }
}
