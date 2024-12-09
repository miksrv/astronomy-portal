import Script from 'next/script'
import React, { useEffect, useRef, useState } from 'react'

import RenderMap from './RenderMap'
import { TObject } from './types'

interface CelestialMapProps {
    className?: string
    objects?: TObject[]
    interactive?: boolean
    goto?: [number, number]
}

const CelestialMap: React.FC<CelestialMapProps> = ({
    className,
    objects,
    interactive,
    goto
}) => {
    const [width, setWidth] = useState<number>(0)

    const ref = useRef<HTMLDivElement>(null)
    const config = { interactive: interactive ?? false }

    useEffect(() => {
        setWidth(ref.current ? ref.current.offsetWidth : 0)
    }, [ref])

    return (
        <div
            ref={ref}
            className={className}
            style={{ height: 100 }}
        >
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

            <RenderMap
                objects={objects ?? []}
                config={config}
                width={width}
                goto={goto}
            />
        </div>
    )
}

export default CelestialMap
