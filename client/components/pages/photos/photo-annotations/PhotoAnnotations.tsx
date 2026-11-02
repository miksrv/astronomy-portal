import React, { useMemo } from 'react'
import { cn } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { locateObject, normalizeDesignation } from '@/utils/astrometry'
import { formatObjectName } from '@/utils/strings'
import { buildSkyGrid, formatGridValue } from '@/utils/wcs'

import { PhotoSkyObject } from '../types'

import styles from './styles.module.sass'

/** Deep-sky catalogues get the accent, stars stay white; HD/HIP/Tycho are a crowd - drawn faintly */
const kindOf = (type: string): 'deepSky' | 'star' | 'faintStar' => {
    if (type === 'bright') {
        return 'star'
    }

    if (type === 'hd' || type === 'hip' || type === 'tycho2') {
        return 'faintStar'
    }

    return 'deepSky'
}

interface Marker {
    key: string
    kind: 'own' | 'deepSky' | 'star' | 'faintStar'
    x: number
    y: number
    /** Pixels of the solved file */
    radius: number
    label: string
    /** The object's page, for our own objects */
    href?: string
}

interface PhotoAnnotationsProps {
    astrometry: ApiModel.SolvedAstrometry
    /** Our catalog's objects with coordinates; the ones on the picture are drawn with our names */
    objects?: PhotoSkyObject[]
    /** The rings and names of the objects */
    showObjects?: boolean
    /** The RA/Dec grid with the compass */
    showGrid?: boolean
    /** Draw the HD/HIP/Tycho stars too (there can be hundreds) */
    showFaintStars?: boolean
}

/**
 * The plate solve drawn over the picture, the way AstroBin does: a ring with a name on each
 * object - ours first, linking to their pages, then the service's catalogue objects and bright
 * stars - an RA/Dec grid with a compass, and the frame's sky coordinates in a caption. Placed
 * in percent of the picture's box, so it follows the picture at any size.
 */
export const PhotoAnnotations: React.FC<PhotoAnnotationsProps> = ({
    astrometry,
    objects = [],
    showObjects,
    showGrid,
    showFaintStars
}) => {
    const { t } = useTranslation()
    const { solvedWidth: width, solvedHeight: height, wcs } = astrometry
    const annotations = astrometry.annotations ?? []

    // The grid's lines are drawn on request; its compass is always there
    const skyGrid = useMemo(() => (wcs ? buildSkyGrid(wcs) : undefined), [wcs])

    const markers = useMemo((): Marker[] => {
        const own: Marker[] = []
        const twins = new Set<ApiModel.AstrometryAnnotation>()

        for (const object of objects) {
            const located = locateObject(astrometry, object)

            if (!located) {
                continue
            }

            if (located.twin) {
                twins.add(located.twin)
            }

            own.push({
                key: `own-${object.name}`,
                kind: 'own',
                x: located.x,
                y: located.y,
                radius: located.twin?.radius ?? 0,
                label: object.title || formatObjectName(object.name),
                href: `/objects/${object.name}`
            })
        }

        // A narrow field has a handful of HD stars and little else: then they are worth drawing
        const faintStars = annotations.filter(({ type }) => kindOf(type) === 'faintStar').length
        const withFaint = showFaintStars ?? faintStars <= 12
        const ownKeys = new Set(objects.map(({ name }) => normalizeDesignation(name)))

        // The service's ring on one of our objects (NGC 3031 on M 81) would double its name
        const others: Marker[] = annotations
            .filter((item) => !twins.has(item) && !item.names.some((alias) => ownKeys.has(normalizeDesignation(alias))))
            .filter(({ type }) => withFaint || kindOf(type) !== 'faintStar')
            .map((item) => ({
                key: `${item.type}-${item.names.join('-')}`,
                kind: kindOf(item.type),
                x: item.pixelx,
                y: item.pixely,
                radius: item.radius,
                label: item.names.join(' · ')
            }))

        return [...own, ...others]
    }, [astrometry, annotations, objects, showFaintStars])

    return (
        <div className={styles.annotations}>
            {showGrid && skyGrid && wcs && (
                <svg
                    className={styles.grid}
                    viewBox={`0 0 ${wcs.width} ${wcs.height}`}
                    preserveAspectRatio={'none'}
                    aria-hidden={'true'}
                >
                    {skyGrid.lines.map((line) => (
                        <polyline
                            key={`${line.kind}-${line.value}`}
                            points={line.points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
                        />
                    ))}
                </svg>
            )}
            {showGrid &&
                skyGrid &&
                wcs &&
                skyGrid.lines.map(
                    (line) =>
                        line.label && (
                            <span
                                key={`label-${line.kind}-${line.value}`}
                                className={cn(styles.gridLabel, styles[line.label.edge])}
                                style={
                                    {
                                        '--x': `${(line.label.x / wcs.width) * 100}%`,
                                        '--y': `${(line.label.y / wcs.height) * 100}%`
                                    } as React.CSSProperties
                                }
                            >
                                {formatGridValue(line, line.kind === 'ra' ? skyGrid.raStep : skyGrid.decStep)}
                            </span>
                        )
                )}

            {showObjects &&
                markers.map((item) => {
                    // A star gets a ring of a fixed size; so does an object the catalogue has no size for
                    const minRadius = width * 0.006
                    const radius =
                        item.kind === 'deepSky' || item.kind === 'own' ? Math.max(item.radius, minRadius) : minRadius
                    // An object larger than the frame (a nebula the picture is a part of): its ring
                    // would be out of view, so the name is set at its centre over a small cross
                    const oversized = radius > width * 0.4
                    // A name near the right edge would be cut off: set it on the left of the ring
                    const flipped = !oversized && item.x / width > 0.7
                    const name = <b>{item.label}</b>

                    return (
                        <span
                            key={item.key}
                            className={cn(
                                styles.marker,
                                styles[item.kind],
                                oversized && styles.oversized,
                                flipped && styles.flipped
                            )}
                            style={
                                {
                                    '--x': `${(item.x / width) * 100}%`,
                                    '--y': `${(item.y / height) * 100}%`,
                                    '--size': oversized ? '24px' : `${((radius * 2) / width) * 100}%`
                                } as React.CSSProperties
                            }
                        >
                            <i />
                            {item.href ? <Link href={item.href}>{name}</Link> : name}
                        </span>
                    )
                })}

            {skyGrid && (
                <svg
                    className={styles.compass}
                    viewBox={'-20 -20 40 40'}
                    role={'img'}
                    aria-label={t('components.pages.photos.photo-annotations.compass', 'Север и восток на снимке')}
                >
                    <line
                        x2={skyGrid.north.x * 11}
                        y2={skyGrid.north.y * 11}
                    />
                    <line
                        x2={skyGrid.east.x * 11}
                        y2={skyGrid.east.y * 11}
                    />
                    <text
                        x={skyGrid.north.x * 16}
                        y={skyGrid.north.y * 16}
                    >
                        N
                    </text>
                    <text
                        x={skyGrid.east.x * 16}
                        y={skyGrid.east.y * 16}
                    >
                        E
                    </text>
                </svg>
            )}
        </div>
    )
}
