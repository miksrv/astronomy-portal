import { RefObject, useCallback, useMemo, useRef } from 'react'

import { readCenter, readZoomFactor } from './celestialApi'
import { MAX_VIEW_RESTORE_ATTEMPTS } from './horizonNavigation'
import { ViewportSize } from './horizonOverlay'
import { centerMatches, HorizonView, isDomeView, viewToCenter } from './horizonView'
import { horizontalToEquatorial } from './objectInfo'
import { StarMapSettings } from './types'
import { computeHorizonCoverZoom, computeHorizonStartZoom } from './utils'

export interface UseHorizonViewControlOptions {
    settingsRef: RefObject<StarMapSettings>
    /** The direction the visitor is looking — see useHorizonNavigation */
    viewRef: RefObject<HorizonView>
    /** True once Celestial.display() has run (owned by useCelestialDisplay) */
    initializedRef: RefObject<boolean>
    /** The moment the map is currently computed for (useCelestialDisplay.resolveDate) */
    resolveDate: () => Date
    /** The visible area, when the map is fitted to its container; undefined otherwise */
    readViewport: () => ViewportSize | undefined
}

export interface HorizonViewControl {
    /** Point the map at `viewRef` (center + level roll); no-op outside horizon mode */
    applyHorizonView: () => void
    /** Degrees of sky per pixel at the view center, or null if unavailable */
    measureViewScale: () => number | null
    /** The zoom-out floor for the current view, as a Celestial zoom factor */
    horizonMinZoomFactor: () => number
    /** The zoom a look-around opens with (once per display) */
    applyStartupZoom: () => void
    /** Leaving the whole-sky dome: zoom in far enough that the sky covers the frame */
    ensureLookAroundZoom: () => void
    /** End-of-redraw safety net against a center Celestial picked on its own */
    restoreHorizonView: () => void
    /** Hand Celestial the instant (and, in horizon mode, its zenith) — one redraw */
    syncCelestialZenith: (when: Date) => void
    /**
     * Run our own view update: every redraw it causes is recognised as ours by
     * `restoreHorizonView`, so the safety net never chases a center we are about to set.
     */
    withOwnUpdate: (run: () => void) => void
}

/**
 * Horizon-mode view control (FE-3): the map is never allowed to choose its own center —
 * `viewToCenter` turns the azimuth/altitude the visitor is looking at into an equatorial
 * center plus the roll that keeps the zenith straight up, which is what keeps the horizon
 * horizontal and the ground at the bottom (see horizonView.ts). This hook owns everything
 * that points the map, measures it and enforces its zoom floors; useCelestialDisplay
 * composes it with the Celestial lifecycle.
 */
export const useHorizonViewControl = ({
    settingsRef,
    viewRef,
    initializedRef,
    resolveDate,
    readViewport
}: UseHorizonViewControlOptions): HorizonViewControl => {
    const isHorizon = useCallback(() => settingsRef.current.viewMode === 'horizon', [settingsRef])

    /**
     * Refresh Celestial's own idea of where the zenith is — what its daylight pass (the
     * "Атмосфера" toggle) measures the Sun against.
     *
     * The bundled library keeps the zenith in a private variable that only its internal
     * `l()` routine writes, and `skyview()` calls that routine **only** when
     * `follow === 'zenith'`. Horizon mode deliberately sets `follow: 'center'` (it drives
     * the center itself, see buildVisualConfig), so the zenith stayed at its initial
     * `[0, 0]` forever: the daylight pass then measured the Sun against a point on the
     * celestial equator, read the result as "Sun far below the horizon" (over 108°) and
     * painted nothing — at noon as much as at midnight, with the toggle on or off.
     *
     * `Celestial.date()` is the one public entry that runs the same routine. It does
     * everything `skyview({ date })` does — stores the instant, updates the hidden form,
     * redraws once — and recomputes the zenith on the way, without re-centering the map
     * (`follow: 'center'`). So in horizon mode it *replaces* the date skyview() rather than
     * following it. It reads the observer position from the hidden form, so a location
     * change must reach Celestial (skyview) before this is called.
     */
    const syncCelestialZenith = useCallback(
        (when: Date) => {
            if (!isHorizon()) {
                return
            }

            try {
                // Same offset buildSkyviewPatch passes, so Celestial's date bookkeeping
                // stays consistent with the instant the rest of the map is drawn for
                Celestial.date(when, -when.getTimezoneOffset())
            } catch (error) {
                console.warn(error)
            }
        },
        [isHorizon]
    )

    const applyHorizonView = useCallback(() => {
        if (!isHorizon()) {
            return
        }

        try {
            Celestial.rotate({ center: viewToCenter(viewRef.current, settingsRef.current.geopos, resolveDate()) })
        } catch (error) {
            console.warn(error)
        }
    }, [isHorizon, settingsRef, viewRef, resolveDate])

    /**
     * Degrees of sky per pixel across the view center — the drag scale, so a look-around
     * gesture moves the sky with the pointer at any zoom level. Measured on the live
     * projection (one degree of altitude below the center, which is always inside the map:
     * MIN_VIEW_ALTITUDE keeps the view at least a degree above the horizon).
     */
    const measureViewScale = useCallback((): number | null => {
        if (!initializedRef.current || !isHorizon()) {
            return null
        }

        const view = viewRef.current
        const geopos = settingsRef.current.geopos
        const when = resolveDate()

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
    }, [initializedRef, isHorizon, settingsRef, viewRef, resolveDate])

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
        if (!isHorizon()) {
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
    }, [isHorizon, horizonMinZoomFactor])

    // True while one of our own updates is running: those redraw with a center that is
    // about to be (or has just been) set for the current instant, so the safety net below
    // must not read them as Celestial wandering off.
    const syncingRef = useRef<boolean>(false)

    const withOwnUpdate = useCallback((run: () => void) => {
        syncingRef.current = true

        try {
            run()
        } finally {
            syncingRef.current = false
        }
    }, [])

    // At most one restore in flight, plus a bail-out counter — see
    // MAX_VIEW_RESTORE_ATTEMPTS for why a plain time-based cooldown is not enough.
    const viewRestorePendingRef = useRef<boolean>(false)
    const viewRestoreAttemptsRef = useRef<number>(0)

    // Safety net for a center Celestial picks on its own — its zenith follow-up after
    // display(), a projection rebuild, a stray rotate. Horizon mode has exactly one valid
    // center at any moment, so a redraw that shows a different one is put back. Our own
    // updates (a tick, a time-flow frame, a look-around) are skipped outright via
    // `withOwnUpdate`: they redraw first and re-point the map right after, and chasing them
    // used to double every frame's redraw count. rotate() redraws, so it must not be called
    // from inside a redraw: the restore is deferred to the next task, the redraw it causes
    // finds the center already in place, and the check settles. The counter bounds the
    // (never observed) case of Celestial insisting on a center of its own.
    const restoreHorizonView = useCallback(() => {
        if (syncingRef.current || !isHorizon() || viewRestorePendingRef.current) {
            return
        }

        const current = readCenter()

        if (!current) {
            return
        }

        const wanted = viewToCenter(viewRef.current, settingsRef.current.geopos, resolveDate())

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
    }, [isHorizon, settingsRef, viewRef, resolveDate, applyHorizonView])

    // Every callback above closes over refs and stable callbacks only, so the control
    // object is stable too — effects in useCelestialDisplay depend on it as a whole
    return useMemo(
        () => ({
            applyHorizonView,
            measureViewScale,
            horizonMinZoomFactor,
            applyStartupZoom,
            ensureLookAroundZoom,
            restoreHorizonView,
            syncCelestialZenith,
            withOwnUpdate
        }),
        [
            applyHorizonView,
            measureViewScale,
            horizonMinZoomFactor,
            applyStartupZoom,
            ensureLookAroundZoom,
            restoreHorizonView,
            syncCelestialZenith,
            withOwnUpdate
        ]
    )
}
