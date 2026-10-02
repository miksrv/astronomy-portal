import { RefObject, useCallback, useEffect, useMemo, useRef } from 'react'

import { readZoomFactor, withoutAnimations } from './celestialApi'
import { customConfig, defaultConfig } from './config'
import {
    LIVE_TICK_HIDE_GRACE_MS,
    MAX_REDRAW_INTERVAL_MS,
    MIN_REDRAW_INTERVAL_MS,
    REDRAW_HEADROOM,
    ZOOM_STEP_IN,
    ZOOM_STEP_OUT
} from './constants'
import { detachCelestialZoom } from './horizonNavigation'
import { fitHorizonToView, ViewportSize } from './horizonOverlay'
import { DOME_VIEW, HorizonView, isDomeView, viewToCenter } from './horizonView'
import { StarMapObject, StarMapProps } from './StarMap'
import { advanceClock, TIME_RATE_MIN } from './timeFlow'
import { StarMapSettings } from './types'
import { useHorizonViewControl } from './useHorizonViewControl'
import { useLiveClock } from './useLiveClock'
import {
    buildLiveSettingsPatch,
    buildSkyviewPatch,
    buildVisualConfig,
    computeHorizonCanvasLayout,
    createObjectsJSON
} from './utils'

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
    /**
     * The map's clock (useTimeFlow): advanced here — set to the real now on every live tick
     * and rebuild, stepped by the simulated rate on every frame while the flow runs
     */
    nowRef: RefObject<Date>
    /** The moment the map is currently computed for: the selected date, else `nowRef` */
    resolveDate: () => Date
    /**
     * Seconds of sky per real second (see timeFlow.ts). `1` is the ordinary once-a-minute
     * "now" tick; anything above it runs the animated flow.
     */
    timeRate: number
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
     * Drawn from Celestial's end-of-redraw callback (registered once per display); the
     * custom-layer drawer is published here by useCustomLayers.
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
 * container, live-patching settings via Celestial.apply(), showing a place/moment via
 * Celestial.skyview()/date(), the once-a-minute "now" tick and the animated time flow.
 * Horizon-mode pointing, measuring and zoom floors live in useHorizonViewControl.
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
    nowRef,
    resolveDate,
    timeRate,
    onRedraw,
    clearPopupTimers,
    extendAutoHideGrace
}: UseCelestialDisplayOptions): CelestialDisplayController => {
    const objectsJSON = useMemo(() => createObjectsJSON(objects), [objects])

    // Slot for the custom-layer drawer (filled by useCustomLayers), read by the
    // once-per-display addCallback closure so it always draws with the current props.
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

    const horizon = useHorizonViewControl({ settingsRef, viewRef, initializedRef, resolveDate, readViewport })

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
     * Show the sky for an instant (and, when the place changed, a location) — the one path
     * every "the moment moved" case goes through: a rebuild, a picked date, the live tick
     * and each time-flow frame.
     *
     * Sky mode is a single `skyview()` (one redraw). Horizon mode needs Celestial's zenith
     * for the instant as well, and `Celestial.date()` stores the instant *and* recomputes
     * the zenith in one redraw — so it stands in for the date skyview() instead of following
     * it; the second redraw re-points the map, because the equatorial direction of a fixed
     * azimuth/altitude drifts with the sky. A place change still has to reach the hidden
     * form through skyview() first: `date()` reads the observer position from there.
     * Two redraws per frame, and the horizon safety net knows they are ours.
     */
    const showMoment = useCallback(
        (when: Date, location?: [number, number]) => {
            horizon.withOwnUpdate(() => {
                try {
                    if (settingsRef.current.viewMode !== 'horizon') {
                        Celestial.skyview(buildSkyviewPatch(when, location))
                        return
                    }

                    if (location) {
                        Celestial.skyview(buildSkyviewPatch(when, location))
                    }

                    horizon.syncCelestialZenith(when)
                    horizon.applyHorizonView()
                } catch (error) {
                    console.warn(error)
                }
            })
        },
        [horizon, settingsRef]
    )

    // Single combined effect: initialise Celestial and (re-)display with objects.
    // viewMode and dsosFull changes rebuild the map: they change the projection/follow
    // target and the DSO data file — things Celestial.apply() can't live-patch.
    useEffect(() => {
        const ref = containerRef

        // The instant this (re)build is computed for — refreshed again right before
        // display() in case the init had to wait for the container's first layout
        nowRef.current = new Date()

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
                localConfig.center = viewToCenter(viewRef.current, settingsRef.current.geopos, resolveDate())
            }
        }

        // Load callback of the (otherwise inert) data layer registered below: binds the
        // portal objects' GeoJSON into Celestial.container so findHitPoint can hit-test
        // them, then redraws so the addCallback paints them.
        const bindPortalObjects = () => {
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

            // The layer registration only matters for its load callback (see
            // bindPortalObjects) — the actual drawing happens in drawCustomLayers via
            // addCallback below, at the END of Celestial's redraw cycle (its own
            // layer-redraw hook runs before the daylight/horizon fills, which would paint
            // over everything in horizon mode).
            if (objects?.length || showSettings) {
                Celestial.add({ callback: bindPortalObjects, redraw: () => undefined, type: 'Point' })
            }

            nowRef.current = new Date()
            Celestial.display(localConfig)

            // Fill portrait screens with sky instead of a letterboxed band (no-op on
            // landscape/desktop, where the canvas already overflows the container)
            fillContainerHeight()

            if (showSettings && settingsRef.current.viewMode === 'horizon') {
                try {
                    // Fit the whole horizon circle (plus label margin) into the visible
                    // area — only meaningful for the whole-sky view; a permalink that shares
                    // a look-around direction brings its own zoom instead
                    if (isDomeView(viewRef.current)) {
                        fitHorizonToView(settingsRef.current.geopos, resolveDate(), readViewport())
                    } else if (!permalinkZoomRef.current) {
                        // A look-around with no zoom of its own (the opening view, or a
                        // permalink that only shares a direction): open at the startup zoom
                        // rather than leaving the sky as a bubble in the middle
                        horizon.applyStartupZoom()
                    }

                    // display() always starts at "now" with a zenith of its own: hand it
                    // the instant (a selected date or the captured now) and its zenith,
                    // then point the map back at the visitor's direction for that instant
                    showMoment(resolveDate())

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
            } else if (showSettings && dateRef.current) {
                // Re-apply the selected moment after a rebuild — display() always starts
                // at "now" (safe here: location:true guarantees the hidden form exists)
                showMoment(dateRef.current)
            }

            // Restore the permalink's zoom once, after the first display
            if (permalinkZoomRef.current) {
                try {
                    const current = readZoomFactor()

                    if (current != null) {
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

                    horizon.restoreHorizonView()
                    onRedraw()
                })
            }

            return true
        }

        // Undo what display() wired up globally: the end-of-redraw callback (a single
        // slot — a stale one would keep drawing a torn-down map's layers) and Celestial's
        // own window-resize listener, which would otherwise resize a detached canvas.
        const teardown = () => {
            clearPopupTimers()

            if (!initializedRef.current) {
                return
            }

            initializedRef.current = false

            try {
                Celestial.addCallback(null)

                if (typeof d3 !== 'undefined') {
                    d3.select(window).on('resize', null)
                }
            } catch (error) {
                console.warn(error)
            }
        }

        if (!initCelestial()) {
            const frameId = requestAnimationFrame(() => {
                initCelestial()
            })

            return () => {
                cancelAnimationFrame(frameId)
                teardown()
            }
        }

        return teardown
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

        const applyResize = () => {
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
            // restored. Animations are already off in this mode's config, so nothing to
            // toggle.
            if (horizonMode) {
                const layout = computeHorizonCanvasLayout(width, height)
                const zoomFactor = readZoomFactor()

                horizon.withOwnUpdate(() =>
                    withoutAnimations(() => {
                        Celestial.apply({ background: { width: layout.backgroundWidth } })
                        Celestial.resize({ width: layout.width })

                        if (isDomeView(viewRef.current)) {
                            // Whole-sky view: re-fit the dome to the new area
                            fitHorizonToView(settingsRef.current.geopos, resolveDate(), readViewport())
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
                        horizon.applyHorizonView()
                    }, true)
                )

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
            // must survive it: the user's zoom factor is restored, without the zoom
            // animation — a sidebar toggle should feel like a reflow, not a 1–2 s zoom flight.
            const zoomFactor = readZoomFactor()

            Celestial.resize({ width })
            fillContainerHeight()

            withoutAnimations(() => {
                if (zoomFactor != null && Math.abs(zoomFactor - 1) > 0.001) {
                    Celestial.zoomBy(zoomFactor)
                }
            })
        }

        // One layout pass per animation frame, latest size wins: a live drag-resize (or the
        // sidebar sliding open) reports many sizes in quick succession, and each pass is
        // several synchronous full redraws. Deferring out of the observer callback also
        // keeps resize()'s own canvas size change from re-entering the observer loop.
        let frameId = 0

        const observer = new ResizeObserver(() => {
            if (!frameId) {
                frameId = requestAnimationFrame(() => {
                    frameId = 0
                    applyResize()
                })
            }
        })

        observer.observe(container)

        return () => {
            cancelAnimationFrame(frameId)
            observer.disconnect()
        }
    }, [fitContainer, showSettings, fillContainerHeight, readViewport, resolveDate, horizon])

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

    // Live date/location updates (FE-2): patch the running map instead of rebuilding it.
    // The initial values are already in the display config. Same StrictMode-safe principle
    // as the settings patch above: remember the last applied place+moment key (seeded with
    // the mount values, which display() already used) and only act when it actually
    // changes. The place is only sent along when it changed — a date pick alone must not
    // pay for a location patch.
    const [observerLat, observerLon] = settings.geopos
    const skyviewKey = `${observerLat}_${observerLon}_${date?.getTime() ?? 'now'}`
    const appliedSkyviewKeyRef = useRef(skyviewKey)
    const appliedGeoposRef = useRef<[number, number]>([observerLat, observerLon])
    useEffect(() => {
        if (!showSettings || !initializedRef.current || appliedSkyviewKeyRef.current === skyviewKey) {
            return
        }

        const [appliedLat, appliedLon] = appliedGeoposRef.current
        const placeChanged = appliedLat !== observerLat || appliedLon !== observerLon

        appliedSkyviewKeyRef.current = skyviewKey
        appliedGeoposRef.current = [observerLat, observerLon]
        nowRef.current = new Date()

        showMoment(date ?? nowRef.current, placeChanged ? [observerLat, observerLon] : undefined)
    }, [showSettings, observerLat, observerLon, date, nowRef, showMoment])

    // "Now" mode keeps up with real time: once a minute advance nowRef and hand the new
    // instant to Celestial (the visitor's center is untouched in sky mode; horizon mode
    // re-points the map — see showMoment). Sun/Moon/planet hit-testing and the horizon
    // overlay key their caches by the instant, so they refresh on their own.
    const handleLiveTick = useCallback(() => {
        if (!initializedRef.current || dateRef.current) {
            return
        }

        nowRef.current = new Date()

        // The redraws this triggers would otherwise arm the popup's auto-hide timer in
        // the addCallback — an open info panel must not vanish by itself once a minute.
        extendAutoHideGrace(Date.now() + LIVE_TICK_HIDE_GRACE_MS)
        showMoment(nowRef.current)
    }, [dateRef, nowRef, extendAutoHideGrace, showMoment])

    useLiveClock(Boolean(showSettings) && date == null && timeRate <= TIME_RATE_MIN, handleLiveTick)

    /**
     * Animated time flow (the ×2/×8 buttons): the simulated clock lives in `nowRef` and the
     * canvas is redrawn straight from this loop — no React state is touched per frame, so
     * the settings panel and the rest of the tree never re-render at animation rate. The
     * two places that show the moment poll `resolveDate()` on their own once-a-second tick.
     *
     * The clock advances every frame but the sky is redrawn only as often as the device can
     * afford: a full skyview() costs ~20 ms on a desktop and several times that on a phone,
     * so the next redraw is held off for twice the last one's duration (never more than
     * MAX_REDRAW_INTERVAL_MS). Frame rate therefore changes the smoothness, never the speed
     * of time — the elapsed real milliseconds are what gets multiplied.
     */
    useEffect(() => {
        if (!showSettings || timeRate <= TIME_RATE_MIN) {
            return
        }

        let frameId = requestAnimationFrame(step)
        let previousFrameMs = performance.now()
        let lastRedrawMs = 0
        let redrawInterval = MIN_REDRAW_INTERVAL_MS

        function step(frameMs: number) {
            frameId = requestAnimationFrame(step)

            if (!initializedRef.current) {
                previousFrameMs = frameMs
                return
            }

            nowRef.current = advanceClock(nowRef.current, frameMs - previousFrameMs, timeRate)
            previousFrameMs = frameMs

            if (frameMs - lastRedrawMs < redrawInterval) {
                return
            }

            lastRedrawMs = frameMs

            // A redraw a second is still a redraw the popup's auto-hide would react to
            extendAutoHideGrace(Date.now() + LIVE_TICK_HIDE_GRACE_MS)

            const startedAt = performance.now()

            showMoment(nowRef.current)

            redrawInterval = Math.min(
                MAX_REDRAW_INTERVAL_MS,
                Math.max(MIN_REDRAW_INTERVAL_MS, (performance.now() - startedAt) * REDRAW_HEADROOM)
            )
        }

        return () => cancelAnimationFrame(frameId)
    }, [showSettings, timeRate, nowRef, extendAutoHideGrace, showMoment])

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
                    applied = Math.max(factor, Math.min(1, horizon.horizonMinZoomFactor() / current))
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
        [showSettings, settingsRef, horizon]
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

        if (current.viewMode === 'horizon') {
            // Also the way back out of a look-around: straight up, whole sky, north up
            viewRef.current = DOME_VIEW

            withoutAnimations(() => {
                horizon.applyHorizonView()
                fitHorizonToView(current.geopos, resolveDate(), readViewport())
            }, true)

            return
        }

        withoutAnimations(() => {
            const zoomFactor = readZoomFactor()

            if (zoomFactor != null && Math.abs(zoomFactor - 1) > 0.001) {
                Celestial.zoomBy(1 / zoomFactor)
            }
        })
    }, [settingsRef, viewRef, readViewport, resolveDate, horizon])

    return {
        initializedRef,
        drawCustomLayersRef,
        zoomIn,
        zoomOut,
        zoomBy,
        applyHorizonView: horizon.applyHorizonView,
        measureViewScale: horizon.measureViewScale,
        ensureLookAroundZoom: horizon.ensureLookAroundZoom,
        fitView
    }
}
