import React from 'react'

import dynamic from 'next/dynamic'

import { ApiModel } from '@/api'

const StarMapRender = dynamic(() => import('./StarMapRender'), {
    ssr: false
})

export type StarMapObject = Pick<ApiModel.Object, 'name' | 'ra' | 'dec'>

export interface StarMapProps {
    objects?: StarMapObject[]
    interactive?: boolean
    goto?: [number, number]
    zoom?: number
}

export const StarMap: React.FC<StarMapProps> = ({ ...props }) => <StarMapRender {...props} />
