import { formatObjectName } from '@/tools/strings'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useMemo, useRef } from 'react'

import { StarMapObject, StarMapProps } from './StarMap'
import { FONT, customConfig, defaultConfig } from './config'
import styles from './styles.module.sass'

type geoJSONType = {
    type: 'FeatureCollection'
    features: {
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
    }[]
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

// TODO: On screen resize rerender StarMap
// TODO: Implement interactive mode
// TODO: Implement goto method
const StarMapRender: React.FC<StarMapProps> = ({ objects, zoom }) => {
    const { i18n } = useTranslation()

    const ref = useRef<HTMLDivElement>(null)

    const objectsJSON = useMemo(() => createObjectsJSON(objects), [objects])

    const handleCallback = (error: any) => {
        if (error) {
            console.warn(error)
            return null
        }

        let skyPoint = Celestial.getData(objectsJSON, defaultConfig.transform)

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
            .each(
                (point: {
                    geometry: { coordinates: any }
                    properties: { name: any }
                }) => {
                    if (Celestial.clip(point.geometry.coordinates)) {
                        let pointCoords = Celestial.mapProjection(
                                point.geometry.coordinates
                            ),
                            pointRadius = 5

                        Celestial.setStyle(stylePoint)
                        Celestial.context.beginPath()
                        Celestial.context.arc(
                            pointCoords[0],
                            pointCoords[1],
                            pointRadius,
                            0,
                            2 * Math.PI
                        )
                        Celestial.context.closePath()
                        Celestial.context.stroke()
                        Celestial.context.fill()
                        Celestial.setTextStyle(styleText)
                        Celestial.context.fillText(
                            point.properties.name,
                            pointCoords[0] + pointRadius - 1,
                            pointCoords[1] - pointRadius + 1
                        )
                    }
                }
            )
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
                customConfig.center = [
                    objects[0].ra || 0,
                    objects[0].dec || 0,
                    1
                ]
            }

            Celestial.display(customConfig)
        }
    }, [objects])

    return (
        <div
            ref={ref}
            id={'celestial-map'}
            className={styles.starMap}
        />
    )
}

const createObjectsJSON = (
    objects?: StarMapObject[]
): geoJSONType | undefined => {
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
