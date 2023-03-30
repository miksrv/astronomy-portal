import React, { useEffect, useRef, useState } from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'
import RenderMap from './RenderMap'
import styles from './SkyMap.module.sass'
import { TObject } from './types'
import Script from "next/script";

type TSkyMapProps = {
    objects: TObject[] | undefined
    interactive?: boolean
    goto?: [number, number]
}

const SkyMap: React.FC<TSkyMapProps> = (props) => {
    const { objects, interactive, goto } = props
    const [width, setWidth] = useState<number>(0)

    const ref = useRef<HTMLDivElement>(null)
    const config = {
        interactive: interactive ?? false
    }

    useEffect(() => {
        setWidth(ref.current ? ref.current.offsetWidth : 0)
    }, [ref])

    return (
        <div ref={ref}>
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
            {objects === undefined || !objects.length || width === 0 ? (
                <div className={styles.mapLoader}>
                    <Dimmer active>
                        <Loader>Загрузка</Loader>
                    </Dimmer>
                </div>
            ) : (
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

export default SkyMap
