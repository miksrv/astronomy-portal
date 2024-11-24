import { useTranslation } from 'next-i18next'
import Script from 'next/script'
import React, { useEffect, useRef } from 'react'

import { customConfig } from './config'
import styles from './styles.module.sass'

interface StarMapProps {}

const StarMap: React.FC<StarMapProps> = () => {
    const { t, i18n } = useTranslation()

    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (ref.current) {
            customConfig.width = ref.current.offsetWidth
        }

        customConfig.lang = i18n.language

        Celestial.clear()
        Celestial.display(customConfig)
    }, [])

    return (
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

            <div
                ref={ref}
                id={'celestial-map'}
                className={styles.skyMap}
            />
        </>
    )
}

export default StarMap
