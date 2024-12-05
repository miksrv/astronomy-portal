import dynamic from 'next/dynamic'
import Script from 'next/script'
import React from 'react'

const StarMapRender = dynamic(() => import('./StarMapRender'), {
    ssr: false
})

export type StarMapObject = {
    ra: number
    dec: number
    name: string
}

export interface StarMapProps {
    objects?: StarMapObject[]
    interactive?: boolean
    goto?: [number, number]
}

const StarMap: React.FC<StarMapProps> = ({ ...props }) => (
    <>
        <Script
            src='/scripts/d3.min.js'
            strategy='beforeInteractive'
        />
        <Script
            src='/scripts/d3.geo.projection.min.js'
            strategy='beforeInteractive'
        />
        <Script
            src='/scripts/celestial.min.js'
            strategy='beforeInteractive'
        />

        <StarMapRender {...props} />
    </>
)

export default StarMap
