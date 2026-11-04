import React, { useMemo, useRef, useState } from 'react'
import { cn, Skeleton } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { StarMap } from '@/components/common'
import { getMountTelescope } from '@/components/common/star-map/telescope'
import { useInView } from '@/hooks/useInView'

import { MAP_CONFIG } from '../constants'
import { getMapCenter, getMapZoom } from '../utils'

import styles from './styles.module.sass'

interface SkyMapProps {
    /** Missing while the mount is off or INDI is down: the map is shown veiled */
    mount?: ApiModel.ObservatoryMount | null
    /** The camera's field of view, degrees */
    fov?: { width: number; height: number } | null
    /** The note over a veiled map instead of "position unknown" (the observatory is switched off) */
    restingNote?: string
}

/**
 * A small sky map of where the telescope points: a crosshair, the camera's field of view and the
 * GOTO target when it differs. The star map's scripts load only when the card nears the
 * viewport, so the dashboard's first screen stays light. A parked mount still shows where the
 * tube looks, with a note; an unknown position veils the map.
 */
export const SkyMap: React.FC<SkyMapProps> = ({ mount, fov, restingNote }) => {
    const { t } = useTranslation()

    const ref = useRef<HTMLDivElement>(null)
    const inView = useInView(ref, '300px')

    // Dragging and wheel zoom only with a mouse: on a phone dragging the map would take the
    // page's scroll away; the zoom buttons work everywhere. Read once, the map renders on the
    // client only (after it nears the viewport)
    const [finePointer] = useState(
        () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches
    )
    const config = useMemo(() => ({ ...MAP_CONFIG, interactive: finePointer }), [finePointer])

    const viewControls = useMemo(
        () => ({
            zoomIn: t('components.pages.observatory.status.map-zoom-in', 'Приблизить'),
            zoomOut: t('components.pages.observatory.status.map-zoom-out', 'Отдалить'),
            toTelescope: t('components.pages.observatory.status.map-to-telescope', 'К телескопу')
        }),
        [t]
    )

    const telescope = useMemo(
        () => getMountTelescope(mount, fov, true),
        // The marker follows the numbers, not the object the poll hands over

        [mount?.parked, mount?.raJ2000, mount?.decJ2000, mount?.target?.ra, mount?.target?.dec, fov?.width, fov?.height]
    )

    const center = useMemo(
        () => (mount ? getMapCenter(mount) : undefined),

        [mount?.raJ2000, mount?.decJ2000]
    )

    return (
        <figure
            ref={ref}
            className={styles.skyMap}
        >
            <div className={cn(styles.map, !telescope && styles.muted, finePointer && styles.draggable)}>
                {inView ? (
                    <StarMap
                        className={styles.canvas}
                        fitContainer={true}
                        interactive={false}
                        zoom={getMapZoom(fov)}
                        center={center}
                        telescope={telescope}
                        viewControls={viewControls}
                        config={config}
                    />
                ) : (
                    <Skeleton className={styles.canvas} />
                )}
                {(mount?.parked || !telescope) && (
                    <p className={styles.note}>
                        {telescope
                            ? t('components.pages.observatory.status.map-parked', 'Телескоп припаркован')
                            : (restingNote ??
                              t('components.pages.observatory.status.map-unknown', 'Положение телескопа неизвестно'))}
                    </p>
                )}
            </div>
            {/* A key only when there is something to read it for */}
            {telescope && (
                <figcaption className={styles.legend}>
                    <span>
                        <i className={styles.keyPoint} />
                        {t('components.pages.observatory.status.map-pointing', 'куда смотрит')}
                    </span>
                    {fov && (
                        <span>
                            <i className={styles.keyFov} />
                            {t('components.pages.observatory.status.map-fov', 'поле зрения камеры')}
                        </span>
                    )}
                    {telescope?.target && (
                        <span>
                            <i className={styles.keyTarget} />
                            {t('components.pages.observatory.status.map-target', 'цель GOTO')}
                        </span>
                    )}
                </figcaption>
            )}
        </figure>
    )
}
