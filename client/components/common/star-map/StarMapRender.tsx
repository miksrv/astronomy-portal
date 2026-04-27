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
    POPUP_HEIGHT,
    POPUP_WIDTH,
    stylePoint,
    styleText
} from './constants'
import { StarMapProps } from './StarMap'
import StarMapSettingsForm from './StarMapSettingsForm'
import { PendingPopup, PopupState, SkyPoint, StarMapSettings } from './types'
import { clampPopupPosition, createObjectsJSON, findHitPoint, loadStarMapSettings, saveStarMapSettings } from './utils'

import styles from './styles.module.sass'

const StarMapRender: React.FC<StarMapProps> = ({ objects, zoom, interactive, className, config, showSettings }) => {
    const { i18n } = useTranslation()

    const [popup, setPopup] = useState<PopupState>({
        visible: false,
        x: 0,
        y: 0
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
        const { x, y } = clampPopupPosition(screenCoords[0], screenCoords[1], containerWidth, containerHeight)

        setPopup({
            visible: true,
            x,
            y,
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

    // Single combined effect: initialise Celestial and (re-)display with objects.
    useEffect(() => {
        const localConfig = {
            ...customConfig,
            ...config,
            zoomlevel: zoom || customConfig.zoomlevel,
            lang: i18n?.language || customConfig.lang
        }

        // Apply user settings when the settings panel is enabled
        if (showSettings) {
            localConfig.stars = {
                ...defaultConfig.stars,
                ...localConfig.stars,
                show: settings.starsShow,
                limit: settings.starsLimit
            }
            localConfig.dsos = { ...defaultConfig.dsos, show: settings.dsosShow }
            localConfig.constellations = {
                ...customConfig.constellations,
                names: settings.constellationNames,
                lines: settings.constellationLines,
                bounds: settings.constellationBounds
            }
            ;(localConfig as Record<string, unknown>).lines = {
                graticule: { ...customConfig.lines.graticule, show: settings.graticule },
                equatorial: { ...defaultConfig.lines.equatorial, show: settings.equatorial },
                ecliptic: { ...defaultConfig.lines.ecliptic, show: settings.ecliptic },
                galactic: { ...defaultConfig.lines.galactic, show: settings.galactic },
                supergalactic: defaultConfig.lines.supergalactic
            }
            localConfig.mw = { ...defaultConfig.mw, show: settings.milkyWay }
            localConfig.planets = { ...defaultConfig.planets, show: settings.planetsShow }
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

            // For non-settings mode (object detail pages), center on the single object
            if (!showSettings && objects?.length === 1) {
                localConfig.follow = [objects[0].ra || 0, objects[0].dec || 0]
                localConfig.center = [objects[0].ra || 0, objects[0].dec || 0, 1]
            }

            Celestial.clear()

            const shouldShowObjects = objects?.length && (!showSettings || settings.customObjectsShow)

            if (shouldShowObjects) {
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
    }, [objects, zoom, i18n?.language, settings])

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
            className={cn(styles.starMap, className)}
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
