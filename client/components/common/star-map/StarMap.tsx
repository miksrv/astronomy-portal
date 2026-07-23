import React from 'react'
import { PartialDeep } from 'type-fest'

import dynamic from 'next/dynamic'

import { ApiModel } from '@/api'
import { customConfig } from '@/components/common/star-map/config'

const StarMapRender = dynamic(() => import('./StarMapRender'), {
    ssr: false
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
