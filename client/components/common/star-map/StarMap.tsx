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
}

export const StarMap: React.FC<StarMapProps> = ({ ...props }) => <StarMapRender {...props} />
