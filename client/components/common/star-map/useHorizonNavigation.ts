import { RefObject, useEffect, useRef } from 'react'

import {
    FALLBACK_DEGREES_PER_PIXEL,
    pinchZoomFactor,
    pointerDistance,
    wheelDeltaPixels,
    wheelZoomFactor
} from './horizonNavigation'
import { HorizonView, isDomeView, panView } from './horizonView'

export interface UseHorizonNavigationOptions {
    containerRef: RefObject<HTMLDivElement | null>
    /** Horizon mode with interaction enabled — the hook is inert otherwise */
    enabled: boolean
    /** Where the visitor is looking; owned by useStarMapSettings */
    viewRef: RefObject<HorizonView>
    /** Points the map at `viewRef` — center plus level roll (useCelestialDisplay) */
    applyView: () => void
    /** Degrees of sky per pixel at the view center, or null when it can't be measured */
    measureScale: () => number | null
    /** Called when the view leaves the whole-sky dome, to fill the frame with sky */
    onLeaveDome: () => void
    zoomBy: (factor: number) => void
}

type PointerPosition = { x: number; y: number }

/**
 * Horizon-mode navigation, Stellarium-style: dragging looks around (left/right changes the
 * azimuth, up/down the altitude) with the sky following the pointer, the wheel and pinch
 * zoom, and the horizon stays horizontal throughout because every view is applied with the
 * roll that puts the zenith straight up (horizonView.ts). Nothing here can roll the sky on
 * its own — that is the whole point of replacing d3-celestial's trackball.
 *
 * Listeners live on the map container (a stable React element) rather than on the canvas,
 * which Celestial re-creates on rebuilds; events are only acted on when they actually come
 * from the canvas, so the overlay controls on top of the map keep working normally.
 */
export const useHorizonNavigation = ({
    containerRef,
    enabled,
    viewRef,
    applyView,
    measureScale,
    onLeaveDome,
    zoomBy
}: UseHorizonNavigationOptions): void => {
    // Mirrors, so the listeners (registered once per enabled-state change) always call the
    // current callbacks instead of the ones captured at registration time
    const applyViewRef = useRef(applyView)
    applyViewRef.current = applyView
    const measureScaleRef = useRef(measureScale)
    measureScaleRef.current = measureScale
    const zoomByRef = useRef(zoomBy)
    zoomByRef.current = zoomBy
    const onLeaveDomeRef = useRef(onLeaveDome)
    onLeaveDomeRef.current = onLeaveDome

    useEffect(() => {
        const container = containerRef.current

        if (!enabled || !container) {
            return
        }

        /** Active pointers by id — one means a look-around drag, two a pinch */
        const pointers = new Map<number, PointerPosition>()

        // Drag state: where the gesture started, the view it started from and the
        // projection scale measured at gesture start
        let dragStart: PointerPosition = { x: 0, y: 0 }
        let dragStartView: HorizonView = viewRef.current
        let dragScale = FALLBACK_DEGREES_PER_PIXEL
        let pinchDistance = 0

        // View and zoom changes are coalesced into one Celestial redraw per animation
        // frame: a pointermove can fire several times per frame, and each redraw repaints
        // the whole sky plus the ground overlay.
        let frame = 0
        let pendingView: HorizonView | null = null
        let pendingZoom = 1
        let wheelDelta = 0

        const flush = () => {
            frame = 0

            if (pendingView) {
                // The dome view is fitted so the whole sky sits inside the frame; a
                // look-around wants it to cover the frame instead
                const leavingDome = isDomeView(viewRef.current) && !isDomeView(pendingView)

                viewRef.current = pendingView
                pendingView = null
                applyViewRef.current()

                if (leavingDome) {
                    onLeaveDomeRef.current()
                }
            }

            if (wheelDelta !== 0) {
                pendingZoom *= wheelZoomFactor(wheelDelta)
                wheelDelta = 0
            }

            if (pendingZoom !== 1) {
                zoomByRef.current(pendingZoom)
                pendingZoom = 1
            }
        }

        const schedule = () => {
            if (!frame) {
                frame = requestAnimationFrame(flush)
            }
        }

        const isCanvasEvent = (event: Event): event is Event & { target: HTMLCanvasElement } =>
            event.target instanceof HTMLCanvasElement

        /** Anchor the drag at the current pointer position, view and projection scale. */
        const beginDrag = (position: PointerPosition) => {
            dragStart = { ...position }
            dragStartView = viewRef.current
            dragScale = measureScaleRef.current() ?? FALLBACK_DEGREES_PER_PIXEL
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!isCanvasEvent(event) || (event.pointerType === 'mouse' && event.button !== 0)) {
                return
            }

            // Capture on the canvas: a drag that leaves the map (or the window) keeps
            // delivering moves, and the events still bubble up to this container
            try {
                event.target.setPointerCapture(event.pointerId)
            } catch {
                // Not fatal — without capture the drag simply ends at the container's edge
            }

            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

            if (pointers.size === 1) {
                beginDrag({ x: event.clientX, y: event.clientY })
            }

            if (pointers.size === 2) {
                const [first, second] = [...pointers.values()] as [PointerPosition, PointerPosition]
                pinchDistance = pointerDistance(first, second)
            }
        }

        const handlePointerMove = (event: PointerEvent) => {
            const tracked = pointers.get(event.pointerId)

            if (!tracked) {
                return
            }

            tracked.x = event.clientX
            tracked.y = event.clientY

            if (pointers.size >= 2) {
                const [first, second] = [...pointers.values()] as [PointerPosition, PointerPosition]
                const distance = pointerDistance(first, second)

                pendingZoom *= pinchZoomFactor(pinchDistance, distance)
                pinchDistance = distance
                // A two-finger gesture zooms only — mixing in the look-around from the
                // finger that happens to move more reads as the map fighting the user
                pendingView = null
                schedule()
                return
            }

            pendingView = panView(dragStartView, event.clientX - dragStart.x, event.clientY - dragStart.y, dragScale)
            schedule()
        }

        const endPointer = (event: PointerEvent) => {
            if (!pointers.delete(event.pointerId)) {
                return
            }

            // Dropping from two fingers to one continues the look-around from where the
            // remaining finger is, so the view doesn't jump by the pinch's travel
            if (pointers.size === 1) {
                const [remaining] = [...pointers.values()] as [PointerPosition]

                beginDrag(remaining)
            }
        }

        const handleWheel = (event: WheelEvent) => {
            if (!isCanvasEvent(event)) {
                return
            }

            // The map owns the wheel over its own canvas — otherwise the page scrolls away
            event.preventDefault()

            wheelDelta += wheelDeltaPixels(event.deltaY, event.deltaMode)
            schedule()
        }

        container.addEventListener('pointerdown', handlePointerDown)
        container.addEventListener('pointermove', handlePointerMove)
        container.addEventListener('pointerup', endPointer)
        container.addEventListener('pointercancel', endPointer)
        // A pointer released outside the container never reports up/cancel to it
        window.addEventListener('pointerup', endPointer)
        container.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
            cancelAnimationFrame(frame)
            container.removeEventListener('pointerdown', handlePointerDown)
            container.removeEventListener('pointermove', handlePointerMove)
            container.removeEventListener('pointerup', endPointer)
            container.removeEventListener('pointercancel', endPointer)
            window.removeEventListener('pointerup', endPointer)
            container.removeEventListener('wheel', handleWheel)
        }
    }, [enabled, containerRef, viewRef])
}
