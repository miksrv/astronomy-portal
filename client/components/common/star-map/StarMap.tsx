import React, { useEffect, useState } from 'react'
import { cn, Skeleton } from 'simple-react-ui-kit'
import { PartialDeep } from 'type-fest'

import { ApiModel } from '@/api'
import { customConfig } from '@/components/common/star-map/config'

import { useCelestialScripts } from './useCelestialScripts'

import styles from './styles.module.sass'

export type StarMapObject = Pick<ApiModel.Object, 'name' | 'ra' | 'dec'>

type CustomConfigType = typeof customConfig

export interface StarMapProps {
    className?: string
    interactive?: boolean
    config?: PartialDeep<CustomConfigType>
    objects?: StarMapObject[]
    goto?: [number, number]
    zoom?: number
    /** Show the settings toggle button and panel (only used on the starmap page) */
    showSettings?: boolean
    /**
     * Keep the map's width in sync with its container's width as it resizes, via
     * `Celestial.resize()` (Celestial's own window-resize handling is a no-op once an
     * explicit numeric width has been set). Only used on the full-screen `/starmap` page,
     * whose container is meant to always span the full viewport width/height — the
     * projection's taller-than-viewport overflow is centered and clipped by that page's
     * own wrapper, see `pages/starmap.tsx`.
     */
    fitContainer?: boolean
    /**
     * Reports the map's hide-UI (screenshot mode) toggle, so page-level overlays rendered
     * outside the map element (the `/starmap` SEO intro card) can hide along with the
     * map's own controls.
     */
    onUiHiddenChange?: (hidden: boolean) => void
}

export const StarMap: React.FC<StarMapProps> = ({ ...props }) => {
    // StarMapRender assumes the Celestial global exists at mount, so it can only
    // render once the vendor scripts are ready.
    const celestialReady = useCelestialScripts()

    // The client-only chunk is imported manually (instead of next/dynamic) so it
    // downloads in parallel with the vendor scripts, and both waiting phases share
    // one identically-sized skeleton — no placeholder size jump between them.
    // Effect-only state keeps SSR rendering the skeleton, same as ssr: false did.
    const [StarMapRender, setStarMapRender] = useState<React.ComponentType<StarMapProps> | null>(null)

    useEffect(() => {
        let mounted = true

        void import('./StarMapRender').then((module) => {
            if (mounted) {
                setStarMapRender(() => module.default)
            }
        })

        return () => {
            mounted = false
        }
    }, [])

    return celestialReady && StarMapRender ? (
        <StarMapRender {...props} />
    ) : (
        // Celestial.js only sets the map's real height once it mounts and measures
        // its container — `.starMap`'s `min-height` covers the reserved space; the
        // skeleton just fills it while the scripts + client-only chunk load.
        <Skeleton className={cn(styles.starMap, props.className)} />
    )
}
