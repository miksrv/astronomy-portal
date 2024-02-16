'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'

import RenderMap from './RenderMap'
import { TObject } from './types'

type TSkyMapProps = {
    objects: TObject[] | undefined
    interactive?: boolean
    goto?: [number, number]
}

const CelestialMap: React.FC<TSkyMapProps> = (props) => {
    const { objects, interactive, goto } = props
    const [width, setWidth] = useState<number>(0)

    const ref = useRef<HTMLDivElement>(null)
    const config = { interactive: interactive ?? false }
    const loading = objects === undefined || !objects.length || width === 0

    useEffect(() => {
        setWidth(ref.current ? ref.current.offsetWidth : 0)
    }, [ref])

    return (
        <div ref={ref}>
            <Dimmer active={loading}>
                <Loader>Загрузка</Loader>
            </Dimmer>
            {!loading && (
                <RenderMap
                    objects={objects}
                    config={config}
                    width={width}
                    goto={goto}
                />
            )}
        </div>
    )
}

export default CelestialMap
