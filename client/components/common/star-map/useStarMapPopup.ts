import { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { POPUP_HEIGHT } from './constants'
import { PendingPopup, PopupState, StarMapSettings } from './types'
import { clampPopupPosition } from './utils'

export interface UseStarMapPopupOptions {
    /** The #celestial-map element — the containing block the popup is positioned against */
    containerRef: RefObject<HTMLDivElement | null>
    /** Current settings; the view mode decides whether opening a popup re-centers the map */
    settingsRef: RefObject<StarMapSettings>
}

export interface StarMapPopupController {
    popup: PopupState
    /** Attach to the popup element so it can be measured */
    popupRef: RefObject<HTMLElement | null>
    hidePopup: () => void
    /** Center the map on the target and open its popup once the rotation settles */
    openPendingPopup: (pending: PendingPopup) => void
    /** Call at the end of every Celestial redraw: arms the popup's auto-hide unless suppressed */
    scheduleAutoHideAfterRedraw: () => void
    /** Keep the auto-hide suppressed at least until the given timestamp (ms) */
    extendAutoHideGrace: (until: number) => void
    /** Clear the pending show/hide timers (display teardown) */
    clearPopupTimers: () => void
}

/**
 * Popup state of the star map: opening around a sky position after Celestial's centering
 * animation, measuring the rendered box to lay it out, the auto-hide-on-redraw timer with
 * its grace window, and closing on Escape.
 */
export const useStarMapPopup = ({ containerRef, settingsRef }: UseStarMapPopupOptions): StarMapPopupController => {
    const [popup, setPopup] = useState<PopupState>({
        visible: false,
        anchor: { x: 0, y: 0 },
        x: 0,
        y: 0,
        arrowOffset: 0,
        placement: 'below',
        height: POPUP_HEIGHT,
        positioned: false
    })
    const popupRef = useRef<HTMLElement>(null)

    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
    const showPopupTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
    const suppressHideUntilRef = useRef<number>(0)
    const pendingPopupRef = useRef<PendingPopup | null>(null)

    const hidePopup = useCallback(() => {
        setPopup((prev) => ({ ...prev, visible: false }))
    }, [])

    const showPendingPopup = useCallback(() => {
        const pending = pendingPopupRef.current
        if (!pending) {
            return
        }

        pendingPopupRef.current = null

        const screenCoords = Celestial.mapProjection([pending.ra, pending.dec])
        if (!screenCoords) {
            return
        }

        const containerWidth = containerRef.current?.offsetWidth ?? 0
        const containerHeight = containerRef.current?.offsetHeight ?? 0

        // `screenCoords` is relative to the <canvas> element's own top-left corner. The
        // popup/arrow, however, are positioned relative to #celestial-map (the containing
        // block for their `position: absolute`) — normally the same origin, but fitContainer
        // mode centers a taller/shorter canvas inside #celestial-map via CSS transform, so the
        // two origins can differ. Re-anchor to #celestial-map's origin before clamping.
        const canvas: HTMLCanvasElement | undefined = Celestial.context?.canvas
        const canvasRect = canvas?.getBoundingClientRect()
        const containerRect = containerRef.current?.getBoundingClientRect()
        const offsetX = canvasRect && containerRect ? canvasRect.left - containerRect.left : 0
        const offsetY = canvasRect && containerRect ? canvasRect.top - containerRect.top : 0

        const anchor = { x: screenCoords[0] + offsetX, y: screenCoords[1] + offsetY }

        // Provisional layout with the default popup size; layoutPopup() below re-measures
        // the rendered box (the info variant is auto-height, wider than the photo popup)
        // and fixes x/y/arrowOffset/placement before the popup becomes visible.
        const { x, y, arrowOffset, placement } = clampPopupPosition(anchor.x, anchor.y, containerWidth, containerHeight)

        setPopup({
            visible: true,
            anchor,
            x,
            y,
            arrowOffset,
            placement,
            height: POPUP_HEIGHT,
            positioned: false,
            name: pending.name,
            object: pending.object || undefined,
            info: pending.info,
            infoDate: pending.infoDate
        })

        // A straggler redraw right after the centering animation settles would otherwise
        // schedule a hide 200ms in — give the freshly opened popup a grace period
        suppressHideUntilRef.current = Math.max(suppressHideUntilRef.current, Date.now() + 1200)
    }, [containerRef])

    /**
     * Lay the popup out around its anchor using the popup's real rendered size. Runs in a
     * layout effect (before paint) whenever the popup opens or its content changes, and
     * again from a ResizeObserver when the content resizes after mount (photo skeleton →
     * image, info rows). Only shows the popup once positioned, so it never jumps.
     */
    const layoutPopup = useCallback(() => {
        const element = popupRef.current
        const container = containerRef.current

        if (!element || !container) {
            return
        }

        const popupWidth = element.offsetWidth
        const popupHeight = element.offsetHeight
        const containerWidth = container.offsetWidth
        const containerHeight = container.offsetHeight

        setPopup((prev) => {
            if (!prev.visible || popupWidth <= 0 || popupHeight <= 0) {
                return prev
            }

            const next = clampPopupPosition(
                prev.anchor.x,
                prev.anchor.y,
                containerWidth,
                containerHeight,
                popupWidth,
                popupHeight
            )

            if (
                prev.positioned &&
                prev.height === popupHeight &&
                prev.x === next.x &&
                prev.y === next.y &&
                prev.arrowOffset === next.arrowOffset &&
                prev.placement === next.placement
            ) {
                return prev
            }

            return { ...prev, ...next, height: popupHeight, positioned: true }
        })
    }, [containerRef])

    useLayoutEffect(() => {
        if (popup.visible) {
            layoutPopup()
        }
    }, [popup.visible, popup.anchor, popup.info, popup.object, layoutPopup])

    useEffect(() => {
        const element = popupRef.current

        if (!element) {
            return
        }

        const observer = new ResizeObserver(() => layoutPopup())
        observer.observe(element)

        return () => observer.disconnect()
    }, [layoutPopup])

    /**
     * Center the map on the target and open its popup once the rotation settles.
     *
     * Horizon mode is the exception: its center is locked to the zenith (that is what keeps
     * the ground and the horizon level — see horizonNavigation.ts), so flying to the object
     * would tip the whole dome over. There the popup simply opens where the object already
     * is; the fitted dome shows the entire visible sky anyway.
     */
    const openPendingPopup = useCallback(
        (pending: PendingPopup) => {
            hidePopup()

            pendingPopupRef.current = pending
            suppressHideUntilRef.current = Date.now() + 60_000

            const duration: number =
                settingsRef.current.viewMode === 'horizon'
                    ? 0
                    : Celestial.rotate({ center: [pending.ra, pending.dec, 0] }) || 0

            const buffer = 300
            suppressHideUntilRef.current = Date.now() + duration + buffer

            clearTimeout(showPopupTimeoutRef.current)
            showPopupTimeoutRef.current = setTimeout(showPendingPopup, duration + 100)
        },
        [hidePopup, showPendingPopup, settingsRef]
    )

    // Runs at the very end of every Celestial redraw (see the addCallback registration in
    // useCelestialDisplay): a redraw while the popup is open means the user panned/zoomed
    // away from the marker, so the popup hides — unless a grace window suppresses it.
    const scheduleAutoHideAfterRedraw = useCallback(() => {
        if (Date.now() < suppressHideUntilRef.current) {
            return
        }

        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = setTimeout(hidePopup, 200)
    }, [hidePopup])

    const extendAutoHideGrace = useCallback((until: number) => {
        suppressHideUntilRef.current = Math.max(suppressHideUntilRef.current, until)
    }, [])

    const clearPopupTimers = useCallback(() => {
        clearTimeout(hideTimeoutRef.current)
        clearTimeout(showPopupTimeoutRef.current)
    }, [])

    // Close popup on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && popup.visible) {
                hidePopup()
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [popup.visible, hidePopup])

    return {
        popup,
        popupRef,
        hidePopup,
        openPendingPopup,
        scheduleAutoHideAfterRedraw,
        extendAutoHideGrace,
        clearPopupTimers
    }
}
