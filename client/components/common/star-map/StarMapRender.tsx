import React, { useEffect, useMemo, useRef } from 'react'
import { cn, Container, Skeleton } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { API } from '@/api'
import { createMediumPhotoUrl } from '@/utils/photos'
import { formatObjectName } from '@/utils/strings'

import { customConfig, defaultConfig, FONT } from './config'
import { StarMapObject, StarMapProps } from './StarMap'

import styles from './styles.module.sass'

type geoJSONType = {
    type: 'FeatureCollection'
    features: Array<{
        type: 'Feature'
        id: string
        properties: {
            name: string
            mag: number
            dim: number
        }
        geometry: {
            type: string
            coordinates: [number, number]
        }
    }>
}

const stylePoint = {
    fill: 'rgba(252,130,130,0.4)',
    stroke: '#ff0000',
    width: 1
}

const styleText = {
    align: 'left',
    baseline: 'bottom',
    fill: '#ff0000',
    font: `12px ${FONT}`
}

const POINT_RADIUS = 5

// TODO: On screen resize rerender StarMap
// TODO: Implement goto method
const StarMapRender: React.FC<StarMapProps> = ({ objects, zoom, interactive, className, config }) => {
    const { i18n } = useTranslation()

    const [popup, setPopup] = React.useState<{
        visible: boolean
        x: number
        y: number
        object?: string
        name?: string
    }>({
        visible: false,
        x: 0,
        y: 0
    })

    const getPhotoData = API.usePhotosGetListQuery({ object: popup?.object, limit: 1 }, { skip: !popup?.object })

    const ref = useRef<HTMLDivElement>(null)

    const objectsJSON = useMemo(() => createObjectsJSON(objects), [objects])

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
        Celestial.container
            .selectAll('.sky-points')
            .each((point: { geometry: { coordinates: string }; properties: { name: string } }) => {
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

    useEffect(() => {
        if (ref.current) {
            customConfig.width = ref.current.offsetWidth
        }

        if (i18n?.language) {
            customConfig.lang = i18n.language
        }

        customConfig.zoomlevel = zoom || customConfig.zoomlevel

        Celestial.clear()
        Celestial.display(customConfig)
        Celestial.addCallback(() => {
            setTimeout(() => setPopup((prev) => ({ ...prev, visible: false })), 200)
        })
    }, [])

    useEffect(() => {
        if (objects?.length) {
            Celestial.clear()
            Celestial.add(
                {
                    callback: handleCallback,
                    redraw: handleRedraw,
                    type: 'Point'
                },
                [objectsJSON]
            )

            if (objects?.length === 1) {
                customConfig.follow = [objects[0].ra || 0, objects[0].dec || 0]
                customConfig.center = [objects[0].ra || 0, objects[0].dec || 0, 1]
            }

            Celestial.display({ ...customConfig, ...config })
        }
    }, [objects])

    useEffect(() => {
        const canvas = Celestial.context.canvas
        if (!canvas) {
            return
        }

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            let isOverPoint = false
            Celestial.container.selectAll('.sky-points').each((point: any) => {
                const coords = Celestial.mapProjection(point.geometry.coordinates)
                const dx = x - coords[0]
                const dy = y - coords[1]
                if (Math.sqrt(dx * dx + dy * dy) < POINT_RADIUS) {
                    isOverPoint = true
                }
            })

            if (interactive) {
                canvas.style.cursor = isOverPoint ? 'pointer' : 'default'
            }
        }

        const handleClick = (e: MouseEvent) => {
            if (!interactive) {
                return
            }

            const rect = canvas.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            Celestial.container.selectAll('.sky-points').each((point: any) => {
                const coords = Celestial.mapProjection(point.geometry.coordinates)
                const dx = x - coords[0]
                const dy = y - coords[1]
                if (Math.sqrt(dx * dx + dy * dy) < POINT_RADIUS) {
                    setPopup({
                        visible: true,
                        x: coords[0] + POINT_RADIUS + 10,
                        y: coords[1] - POINT_RADIUS - 10,
                        name: point.properties.name,
                        object: point.id
                    })
                }
            })
        }

        canvas.addEventListener('mousemove', handleMouseMove)
        canvas.addEventListener('click', handleClick)
        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove)
            canvas.removeEventListener('click', handleClick)
        }
    }, [objects])

    return (
        <div
            ref={ref}
            id={'celestial-map'}
            className={cn(styles.starMap, className)}
        >
            {popup.visible && (
                <Container
                    style={{
                        position: 'absolute',
                        left: popup.x,
                        top: popup.y,
                        zIndex: 10,
                        padding: 5,
                        width: 200,
                        height: 180,
                        boxShadow: 'inset 0 0 0 0.5px #363738'
                    }}
                >
                    {getPhotoData.isFetching || getPhotoData.isLoading ? (
                        <Skeleton style={{ width: '100%', height: '100%' }} />
                    ) : (
                        <>
                            <Image
                                alt={''}
                                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                src={
                                    getPhotoData?.data?.items?.[0]?.fileName
                                        ? createMediumPhotoUrl(getPhotoData.data?.items?.[0])
                                        : '/images/no-photo.png'
                                }
                                width={200}
                                height={180}
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
            )}
        </div>
    )
}

const createObjectsJSON = (objects?: StarMapObject[]): geoJSONType | undefined => {
    if (!objects?.length) {
        return undefined
    }

    return {
        type: 'FeatureCollection',
        features: objects.map((item) => ({
            type: 'Feature',
            id: item.name,
            geometry: {
                type: 'Point',
                coordinates: [Number(item.ra), Number(item.dec)]
            },
            properties: {
                dim: 30,
                mag: 10,
                name: formatObjectName(item.name)
            }
        }))
    }
}

export default StarMapRender
