import React from 'react'
import { Skeleton } from 'simple-react-ui-kit'
import { PartialDeep } from 'type-fest'

import dynamic from 'next/dynamic'

import { ApiModel } from '@/api'
import { customConfig } from '@/components/common/star-map/config'

import styles from './styles.module.sass'

const StarMapRender = dynamic(() => import('./StarMapRender'), {
    ssr: false,
    // Celestial.js only sets the map's real height once it mounts and measures
    // its container — without this, the map's spot in the layout is blank
    // (0-height, since `.starMap` had no height of its own before the CSS fix
    // below) until then, causing a layout shift. `.starMap`'s `min-height`
    // covers the reserved space; this just fills it with something while the
    // client-only bundle loads.
    loading: () => <Skeleton className={styles.starMap} />
})

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
}

export const StarMap: React.FC<StarMapProps> = ({ ...props }) => <StarMapRender {...props} />
