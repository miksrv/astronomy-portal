import { ApiModel } from '@/api'
import dynamic from 'next/dynamic'
import React from 'react'

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

const StarMap: React.FC<StarMapProps> = ({ ...props }) => (
    <StarMapRender {...props} />
)

export default StarMap
