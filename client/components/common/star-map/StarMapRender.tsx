import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, cn, Container, Skeleton } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { createMediumPhotoUrl } from '@/utils/photos'

import { customConfig, defaultConfig } from './config'
import {
    DEFAULT_STARMAP_SETTINGS,
    MOBILE_MAX_WIDTH,
    POINT_RADIUS,
    POPUP_ARROW_SIZE,
    POPUP_HEIGHT,
    POPUP_WIDTH,
    stylePoint,
    styleText
} from './constants'
import { StarMapProps } from './StarMap'
import StarMapSettingsForm from './StarMapSettingsForm'
import { PendingPopup, PopupState, SkyPoint, StarMapSettings } from './types'
import {
    buildLiveSettingsPatch,
    buildVisualConfig,
    clampPopupPosition,
    createObjectsJSON,
    findHitPoint,
    loadStarMapSettings,
    saveStarMapSettings
} from './utils'

import styles from './styles.module.sass'

const StarMapRender: React.FC<StarMapProps> = ({
    objects,
    zoom,
    interactive,
    className,
    config,
    showSettings,
    fitContainer
}) => {
    const { i18n } = useTranslation()

    const [popup, setPopup] = useState<PopupState>({
        visible: false,
        x: 0,
        y: 0,
        arrowOffset: 0,
        placement: 'below'
    })

    // Settings state — only loaded from localStorage when showSettings is enabled
    const [settings, setSettings] = useState<StarMapSettings>(() =>
        showSettings ? loadStarMapSettings() : DEFAULT_STARMAP_SETTINGS
    )
    const [settingsOpen, setSettingsOpen] = useState<boolean>(() => {
        if (!showSettings) {
            return false
        }
        // On desktop — open by default; on mobile — closed
        return typeof window !== 'undefined' && window.innerWidth > MOBILE_MAX_WIDTH
    })

    const getPhotoData = API.usePhotosGetListQuery({ object: popup?.object, limit: 1 }, { skip: !popup?.object })

    const ref = useRef<HTMLDivElement>(null)
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
    const showPopupTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
    const rafRef = useRef<number>(0)
    const suppressHideUntilRef = useRef<number>(0)
    const pendingPopupRef = useRef<PendingPopup | null>(null)
    // Center is stored in a ref (not state) so that drag/zoom never triggers a full Celestial rebuild.
    // It is only read once on initial mount to restore the saved position.
    const centerRef = useRef<[number, number, number]>(
        showSettings ? loadStarMapSettings().center : DEFAULT_STARMAP_SETTINGS.center
    )
    // Mirrors `settings` for callbacks registered once with Celestial (handleRedraw), which
    // otherwise would only ever see the settings snapshot captured at registration time.
    const settingsRef = useRef<StarMapSettings>(settings)
    settingsRef.current = settings

    const objectsJSON = useMemo(() => createObjectsJSON(objects), [objects])

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

        const containerWidth = ref.current?.offsetWidth ?? 0
        const containerHeight = ref.current?.offsetHeight ?? 0

        // `screenCoords` is relative to the <canvas> element's own top-left corner. The
        // popup/arrow, however, are positioned relative to #celestial-map (the containing
        // block for their `position: absolute`) — normally the same origin, but fitContainer
        // mode centers a taller/shorter canvas inside #celestial-map via CSS transform, so the
        // two origins can differ. Re-anchor to #celestial-map's origin before clamping.
        const canvas: HTMLCanvasElement | undefined = Celestial.context?.canvas
        const canvasRect = canvas?.getBoundingClientRect()
        const containerRect = ref.current?.getBoundingClientRect()
        const offsetX = canvasRect && containerRect ? canvasRect.left - containerRect.left : 0
        const offsetY = canvasRect && containerRect ? canvasRect.top - containerRect.top : 0

        const { x, y, arrowOffset, placement } = clampPopupPosition(
            screenCoords[0] + offsetX,
            screenCoords[1] + offsetY,
            containerWidth,
            containerHeight
        )

        setPopup({
            visible: true,
            x,
            y,
            arrowOffset,
            placement,
            name: pending.name,
            object: pending.object
        })
    }, [])

    const handleSettingsChange = useCallback((newSettings: StarMapSettings) => {
        // Persist the current map center alongside the settings change
        const currentCenter = Celestial.rotate?.() as [number, number, number] | undefined
        if (currentCenter) {
            centerRef.current = currentCenter
            newSettings = { ...newSettings, center: currentCenter }
        }
        setSettings(newSettings)
        saveStarMapSettings(newSettings)
    }, [])

    const handleCallback = (error: unknown) => {
        if (error) {
            console.warn(error)
            return null
        }

        const skyPoint = Celestial.getData(objectsJSON, defaultConfig.transform)

        Celestial.container
            .selectAll('.sky-points')
            .data(skyPoint.features)
            .enter()
            .append('path')
            .attr('class', 'sky-points')
        Celestial.redraw()
    }

    const handleRedraw = () => {
        if (showSettings && !settingsRef.current.customObjectsShow) {
            return
        }

        Celestial.container.selectAll('.sky-points').each((point: SkyPoint) => {
            if (Celestial.clip(point.geometry.coordinates)) {
                const pointCoords = Celestial.mapProjection(point.geometry.coordinates)

                Celestial.setStyle(stylePoint)
                Celestial.context.beginPath()
                Celestial.context.arc(pointCoords[0], pointCoords[1], POINT_RADIUS, 0, 2 * Math.PI)
                Celestial.context.closePath()
                Celestial.context.stroke()
                Celestial.context.fill()
                Celestial.setTextStyle(styleText)
                Celestial.context.fillText(
                    point.properties.name,
                    pointCoords[0] + POINT_RADIUS - 1,
                    pointCoords[1] - POINT_RADIUS + 1
                )
            }
        })
    }

    const initializedRef = useRef<boolean>(false)
    // Last width handed to Celestial.resize() when fitContainer is enabled — avoids
    // redundant resize() calls on every ResizeObserver tick.
    const lastFitWidthRef = useRef<number>(0)

    // Single combined effect: initialise Celestial and (re-)display with objects.
    useEffect(() => {
        const localConfig = {
            ...customConfig,
            ...config,
            zoomlevel: zoom || customConfig.zoomlevel,
            lang: i18n?.language || customConfig.lang
        }

        // Apply user settings (initial snapshot) when the settings panel is enabled.
        // Later toggles are applied live via Celestial.apply() — see the effect below —
        // so this branch only runs again on mount or when objects/zoom/language change.
        if (showSettings) {
            Object.assign(localConfig, buildVisualConfig(settingsRef.current))
            localConfig.center = centerRef.current
            localConfig.follow = [centerRef.current[0], centerRef.current[1]]
        }

        const initCelestial = () => {
            if (ref.current) {
                localConfig.width = ref.current.offsetWidth
            }

            if (localConfig.width <= 0 && ref.current) {
                return false
            }

            if (fitContainer) {
                lastFitWidthRef.current = localConfig.width
            }

            // For non-settings mode (object detail pages), center on the single object
            const singleObject = !showSettings && objects?.length === 1 ? objects[0] : undefined

            if (singleObject) {
                localConfig.follow = [singleObject.ra || 0, singleObject.dec || 0]
                localConfig.center = [singleObject.ra || 0, singleObject.dec || 0, 1]
            }

            Celestial.clear()

            // Always add the layer if there are objects — visibility of the layer itself
            // is toggled live inside handleRedraw via settingsRef, so this doesn't need to
            // depend on `settings.customObjectsShow` (which would force this effect to rebuild
            // the whole map on every panel toggle).
            if (objects?.length) {
                Celestial.add(
                    {
                        callback: handleCallback,
                        redraw: handleRedraw,
                        type: 'Point'
                    },
                    [objectsJSON]
                )
            }

            Celestial.display(localConfig)

            if (!initializedRef.current) {
                initializedRef.current = true
                Celestial.addCallback(() => {
                    if (Date.now() < suppressHideUntilRef.current) {
                        return
                    }

                    clearTimeout(hideTimeoutRef.current)
                    hideTimeoutRef.current = setTimeout(hidePopup, 200)
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
                clearTimeout(hideTimeoutRef.current)
                clearTimeout(showPopupTimeoutRef.current)
            }
        }

        return () => {
            clearTimeout(hideTimeoutRef.current)
            clearTimeout(showPopupTimeoutRef.current)
        }
    }, [objects, zoom, i18n?.language])

    // Keep the map fitted to its container on resize. Celestial has its own window-resize
    // listener, but it's a no-op once an explicit numeric width has been set (its getWidth()
    // just echoes back cfg.width), so fitContainer mode has to drive resizing itself via the
    // public Celestial.resize() API.
    useEffect(() => {
        if (!fitContainer || !ref.current) {
            return
        }

        const container = ref.current

        const handleResize = () => {
            if (!initializedRef.current) {
                return
            }

            const width = container.offsetWidth

            if (width > 0 && Math.round(width) !== Math.round(lastFitWidthRef.current)) {
                lastFitWidthRef.current = width
                Celestial.resize({ width })
            }
        }

        const observer = new ResizeObserver(handleResize)
        observer.observe(container)

        return () => observer.disconnect()
    }, [fitContainer])

    // Apply settings-panel toggles live via Celestial.apply(), which merges the partial
    // config and redraws in place — no Celestial.clear()/display() rebuild, so the map
    // doesn't blink on every checkbox change. Skips the very first run since the initial
    // values are already applied by the mount pass of the effect above.
    const settingsAppliedOnceRef = useRef(false)
    useEffect(() => {
        if (!showSettings) {
            return
        }

        if (!settingsAppliedOnceRef.current) {
            settingsAppliedOnceRef.current = true
            return
        }

        Celestial.apply(buildLiveSettingsPatch(settings))
    }, [showSettings, settings])

    // Periodically save center position to localStorage when user drags/zooms the map.
    // Uses a ref (not state) to avoid triggering Celestial rebuilds.
    useEffect(() => {
        if (!showSettings) {
            return
        }

        const saveCenterToStorage = () => {
            const currentCenter = Celestial.rotate()
            if (!currentCenter) {
                return
            }

            const center = currentCenter as [number, number, number]
            const prev = centerRef.current

            if (prev[0] === center[0] && prev[1] === center[1] && prev[2] === center[2]) {
                return
            }

            centerRef.current = center
            saveStarMapSettings({ ...settings, center })
        }

        const intervalId = setInterval(saveCenterToStorage, 3000)

        return () => {
            clearInterval(intervalId)
        }
    }, [showSettings, settings])

    // Canvas mouse/click interaction
    useEffect(() => {
        const canvas = Celestial.context.canvas
        if (!canvas) {
            return
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (!interactive) {
                return
            }

            cancelAnimationFrame(rafRef.current)
            rafRef.current = requestAnimationFrame(() => {
                const rect = canvas.getBoundingClientRect()
                const x = e.clientX - rect.left
                const y = e.clientY - rect.top

                const hit = findHitPoint(x, y)
                canvas.style.cursor = hit ? 'pointer' : 'default'
            })
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

                hidePopup()

                pendingPopupRef.current = {
                    name: hit.point.properties.name,
                    object: hit.point.id,
                    ra: Number(ra),
                    dec: Number(dec)
                }

                suppressHideUntilRef.current = Date.now() + 60_000

                const duration: number = Celestial.rotate({ center: [ra, dec, 0] }) || 0

                const buffer = 300
                suppressHideUntilRef.current = Date.now() + duration + buffer

                clearTimeout(showPopupTimeoutRef.current)
                showPopupTimeoutRef.current = setTimeout(showPendingPopup, duration + 100)
            } else {
                hidePopup()
            }
        }

        canvas.addEventListener('mousemove', handleMouseMove)
        canvas.addEventListener('click', handleClick)

        return () => {
            cancelAnimationFrame(rafRef.current)
            canvas.removeEventListener('mousemove', handleMouseMove)
            canvas.removeEventListener('click', handleClick)
        }
    }, [objects, interactive])

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
    }, [popup.visible])

    return (
        <div
            ref={ref}
            id={'celestial-map'}
            className={cn(styles.starMap, fitContainer && styles.starMapFit, className)}
        >
            {showSettings && (
                <Button
                    icon={'Settings'}
                    mode={'secondary'}
                    className={cn(styles.settingsButton, settingsOpen && styles.settingsButtonActive)}
                    onClick={() => setSettingsOpen((prev) => !prev)}
                />
            )}

            {showSettings && settingsOpen && (
                <StarMapSettingsForm
                    settings={settings}
                    onChange={handleSettingsChange}
                />
            )}

            <div
                className={cn(
                    styles.popupArrow,
                    popup.placement === 'above' ? styles.popupArrowDown : styles.popupArrowUp,
                    popup.visible && styles.popupArrowVisible
                )}
                style={{
                    left: popup.x + popup.arrowOffset - POPUP_ARROW_SIZE,
                    top: popup.placement === 'above' ? popup.y + POPUP_HEIGHT : popup.y - POPUP_ARROW_SIZE
                }}
            />

            <Container
                className={cn(styles.popup, popup.visible && styles.popupVisible)}
                style={{
                    left: popup.x,
                    top: popup.y
                }}
            >
                {getPhotoData.isFetching || getPhotoData.isLoading ? (
                    <Skeleton style={{ width: '100%', height: '100%' }} />
                ) : (
                    <>
                        <Image
                            alt={popup.name || ''}
                            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                            src={
                                getPhotoData?.data?.items?.[0]?.fileName
                                    ? createMediumPhotoUrl(getPhotoData.data?.items?.[0])
                                    : '/images/no-photo.png'
                            }
                            width={POPUP_WIDTH}
                            height={POPUP_HEIGHT}
                        />
                        <div className={styles.popout}>
                            <Link
                                href={`/objects/${popup.object}`}
                                title={popup.name}
                                className={styles.popoutLink}
                            >
                                {popup.name}
                            </Link>
                        </div>
                    </>
                )}
            </Container>
        </div>
    )
}

export default StarMapRender
