import React, { useEffect, useRef } from 'react'

import config from './object'
import styles from './styles.module.sass'
import { TObject, geoJSON } from './types'

interface RenderMapProps {
    config: any
    objects: TObject[]
    width: number
    goto?: [number, number]
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
    font: '12px sans-serif'
}

const usePrevious: any = (value: any) => {
    const ref = useRef()

    useEffect(() => {
        ref.current = value
    })

    return ref.current
}

const createObjectsJSON = (objects: TObject[]) => {
    const geoJSON: any = {
        features: [],
        type: 'FeatureCollection'
    }

    objects.forEach((item) => {
        const objectName = item.name?.replace(/_/g, ' ')
        const objectJSON = {
            geometry: {
                coordinates: [
                    parseFloat(String(item.ra)),
                    parseFloat(String(item.dec))
                ],
                type: 'Point'
            },
            id: objectName,
            properties: {
                dim: 30,
                mag: 10,
                name: objectName
            },
            type: 'Feature'
        }

        geoJSON.features.push(objectJSON)
    })

    return geoJSON
}

const RenderMap: React.FC<RenderMapProps> = (props) => {
    const { objects, width, config: customConfig, goto } = props
    const prevJSON = usePrevious({ objects })

    // const box = document.createElement('div')
    //
    // box.style.width = '200px'
    // box.style.height = '100px'
    // box.style.background = 'gray'
    //
    // document.body.appendChild(box)

    useEffect(() => {
        if (
            prevJSON === undefined ||
            JSON.stringify(prevJSON.objects) !== JSON.stringify(objects)
        ) {
            const geoJSON: geoJSON = createObjectsJSON(objects)

            Celestial.clear()
            Celestial.add(
                {
                    callback: (error: any) => {
                        if (error) {
                            console.warn(error)

                            return null
                        }

                        let skyPoint = Celestial.getData(
                            geoJSON,
                            config.transform
                        )

                        Celestial.container
                            .selectAll('.sky-points')
                            .data(skyPoint.features)
                            .enter()
                            .append('path')
                            .attr('class', 'sky-points')
                        Celestial.redraw()
                    },
                    redraw: () => {
                        Celestial.container
                            .selectAll('.sky-points')
                            .each(
                                (point: {
                                    geometry: { coordinates: any }
                                    properties: { name: any }
                                }) => {
                                    if (
                                        Celestial.clip(
                                            point.geometry.coordinates
                                        )
                                    ) {
                                        let pointCoords =
                                                Celestial.mapProjection(
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
                    },
                    type: 'Point'
                },
                [geoJSON]
            )

            if (geoJSON.features.length === 1) {
                config.follow = [
                    geoJSON.features[0].geometry.coordinates[0],
                    geoJSON.features[0].geometry.coordinates[1]
                ]
                config.center = [
                    geoJSON.features[0].geometry.coordinates[0],
                    geoJSON.features[0].geometry.coordinates[1],
                    0
                ]
            }

            config.width = width
            config.interactive = customConfig.interactive

            if (customConfig.interactive && window.innerWidth <= 760) {
                config.projection = 'orthographic'
            }

            Celestial.display(config)

            if (customConfig.interactive) {
                // const canvas = document.querySelector('canvas')
                // // const ctx = canvas?.getContext("2d")
                //
                // canvas?.addEventListener('click', (e) => {
                //     const rect = canvas.getBoundingClientRect()
                //     const x = e.clientX - rect.left
                //     const y = e.clientY - rect.top
                //
                //     // Добавить точку в месте клика
                //     // ctx?.beginPath();
                //     // ctx?.arc(x,y,5,0,2*Math.PI);
                //     // ctx?.fill();
                //
                //     const findObjects: any[] = objects.filter(
                //         (item: { ra: any; dec: any }) => {
                //             const obj_cord = Celestial.mapProjection([
                //                 item.ra,
                //                 item.dec
                //             ])
                //
                //             if (
                //                 Math.abs(x - obj_cord[0]) <= 15 &&
                //                 Math.abs(y - obj_cord[1]) <= 15
                //             )
                //                 return true
                //             return false
                //         }
                //     )
                //
                //     if (findObjects.length) {
                //         const objectParam = findObjects.pop()
                //
                //         // box.style.left = e.clientX + 'px'
                //         // box.style.top = e.clientY + 'px'
                //         // box.innerHTML = objectParam.name
                //
                //         // SkyMap.rotate({ center: [ objectParam.ra, objectParam.dec, 1 ]})
                //
                //         console.log('findObjects', objectParam)
                //     }
                // })
            }
        }
    }, [objects, prevJSON, width, customConfig.interactive])

    useEffect(() => {
        if (goto !== undefined && goto[0] !== 0 && goto[1] !== 0) {
            Celestial.rotate({ center: [goto[0], goto[1], 1] })
        }
    }, [goto])

    // const canvas = document.querySelector('canvas')
    // const ctx = canvas?.getContext('2d')

    // const getCursorPosition = (canvas: any, event: any) => {
    //     const rect = canvas.getBoundingClientRect()
    //     const x = event.clientX - rect.left
    //     const y = event.clientY - rect.top
    //
    //     const coords = Celestial.mapProjection([299.908, 22.7231])
    //
    //     // console.log('test', SkyMap.mapProjection([x, y]))
    //     // console.log('coords', event.offsetX, event.offsetX)
    // }

    // canvas?.addEventListener('mousedown', (e) => {
    //     getCursorPosition(canvas, e)
    // })

    return (
        <div
            id={'celestial-map'}
            className={styles.skyMap}
        />
    )
}

export default RenderMap
