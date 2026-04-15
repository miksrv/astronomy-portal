import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { cn, Container, Skeleton } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { API } from '@/api'
import { createMediumPhotoUrl } from '@/utils/photos'

import { customConfig, defaultConfig } from './config'
import { POINT_RADIUS, POPUP_HEIGHT, POPUP_WIDTH, stylePoint, styleText } from './constants'
import { StarMapProps } from './StarMap'
import { PendingPopup, PopupState, SkyPoint } from './types'
import { clampPopupPosition, createObjectsJSON, findHitPoint } from './utils'

import styles from './styles.module.sass'

const StarMapRender: React.FC<StarMapProps> = ({ objects, zoom, interactive, className, config }) => {
    const { i18n } = useTranslation()

    const [popup, setPopup] = React.useState<PopupState>({
        visible: false,
        x: 0,
        y: 0
    })

    const getPhotoData = API.usePhotosGetListQuery({ object: popup?.object, limit: 1 }, { skip: !popup?.object })

    const ref = useRef<HTMLDivElement>(null)
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
    const showPopupTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
    const rafRef = useRef<number>(0)
    // Timestamp until which the addCallback redraw handler won't hide the popup
    // (used during intentional rotation animation)
    const suppressHideUntilRef = useRef<number>(0)
    // Pending popup data to show after rotation completes
    const pendingPopupRef = useRef<PendingPopup | null>(null)

    const objectsJSON = useMemo(() => createObjectsJSON(objects), [objects])

    const hidePopup = useCallback(() => {
        setPopup((prev) => ({ ...prev, visible: false }))
    }, [])

    /**
     * After Celestial.rotate() completes and redraws, recalculate the point's screen
     * position (now centered) and show the popup next to it.
     */
    const showPendingPopup = useCallback(() => {
        const pending = pendingPopupRef.current
        if (!pending) {
            return
        }

        pendingPopupRef.current = null

        // Get the new screen coordinates of the point after rotation
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

    // Initialised flag to avoid double-init on strict mode / hot reload
    const initializedRef = useRef<boolean>(false)

    // Single combined effect: initialise Celestial and (re-)display with objects.
    // Merging what was previously two separate useEffects eliminates the race
    // condition where Celestial.display() was called twice on the first render
    // (once from the mount effect with possibly zero width, and once from the
    // objects effect), leading to wrong dimensions on SSR-hydrated page loads.
    useEffect(() => {
        // Build a local config copy so we never mutate the shared module-level object
        const localConfig = {
            ...customConfig,
            ...config,
            zoomlevel: zoom || customConfig.zoomlevel,
            lang: i18n?.language || customConfig.lang
        }

        // Measure container width; on first paint it may still be zero,
        // so we fall back to waiting a frame for layout to settle.
        const initCelestial = () => {
            if (ref.current) {
                localConfig.width = ref.current.offsetWidth
            }

            // If width is still 0 the container hasn't been laid out yet — skip
            if (localConfig.width <= 0 && ref.current) {
                return false
            }

            if (objects?.length) {
                if (objects.length === 1) {
                    localConfig.follow = [objects[0].ra || 0, objects[0].dec || 0]
                    localConfig.center = [objects[0].ra || 0, objects[0].dec || 0, 1]
                }
            }

            Celestial.clear()

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
                    // During intentional rotation animation, suppress popup hiding
                    if (Date.now() < suppressHideUntilRef.current) {
                        return
                    }

                    clearTimeout(hideTimeoutRef.current)
                    hideTimeoutRef.current = setTimeout(hidePopup, 200)
                })
            }

            return true
        }

        // First attempt — if the container already has dimensions, init immediately
        if (!initCelestial()) {
            // Container not laid out yet (typical on SSR hydration first paint).
            // Wait for the next animation frame when the browser has computed layout.
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

            // Throttle via requestAnimationFrame to avoid expensive hit-tests on every pixel
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

                // Hide popup immediately before rotating
                hidePopup()

                // Store pending popup data — will be shown after rotation completes
                pendingPopupRef.current = {
                    name: hit.point.properties.name,
                    object: hit.point.id,
                    ra: Number(ra),
                    dec: Number(dec)
                }

                // Suppress addCallback hide BEFORE calling rotate(), because rotate()
                // triggers a synchronous redraw when the object is already centered (duration=0).
                suppressHideUntilRef.current = Date.now() + 60_000

                // Rotate the map to center on the clicked object.
                // Celestial.rotate() returns the animation duration in ms (0 if already centered).
                const duration: number = Celestial.rotate({ center: [ra, dec, 0] }) || 0

                // Now refine the suppress window to the actual animation duration + buffer
                const buffer = 300
                suppressHideUntilRef.current = Date.now() + duration + buffer

                // Show popup after the rotation animation finishes
                clearTimeout(showPopupTimeoutRef.current)
                showPopupTimeoutRef.current = setTimeout(showPendingPopup, duration + 100)
            } else {
                // Click on empty area — close popup
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
