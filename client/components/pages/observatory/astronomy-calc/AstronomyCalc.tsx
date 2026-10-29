import React, { useEffect, useState } from 'react'
import { Container } from 'simple-react-ui-kit'

import Image from 'next/image'
import { useTranslation } from 'next-i18next/pages'

import { MoonPhaseIcon } from '@/components/common'
import { formatDate } from '@/utils/dates'

import { AstroData, computeAstroData } from './utils'

import styles from './styles.module.sass'

export const AstronomyCalc: React.FC = () => {
    const { t } = useTranslation()

    // Consolidated state to avoid 4 separate re-renders on each tick
    const [astroData, setAstroData] = useState<AstroData>(computeAstroData)

    useEffect(() => {
        const timer = setInterval(() => {
            // Recompute all values inside the tick so they are always fresh
            setAstroData(computeAstroData())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    const { sunAltitude, sunAzimuth, moonAltitude, moonAzimuth, sunTimes, moonTimes, currentDate } = astroData

    const time = (date?: Date | null) => formatDate(date ?? undefined, 'H:mm') ?? '—'

    return (
        <Container className={styles.astronomyCalc}>
            <AstroBody
                title={
                    <>
                        <Image
                            src={'/images/sun.png'}
                            className={styles.icon}
                            alt={''}
                            width={16}
                            height={16}
                        />
                        {t('components.pages.observatory.astronomy-calc.sun', 'Солнце')}
                    </>
                }
                rise={time(sunTimes.sunrise)}
                set={time(sunTimes.sunset)}
                altitude={sunAltitude}
                azimuth={sunAzimuth}
            />
            <AstroBody
                title={
                    <>
                        <MoonPhaseIcon date={currentDate.toDateString()} />
                        {t('components.pages.observatory.astronomy-calc.moon', 'Луна')}
                    </>
                }
                rise={time(moonTimes.rise)}
                set={time(moonTimes.set)}
                altitude={moonAltitude}
                azimuth={moonAzimuth}
            />
        </Container>
    )
}

interface AstroBodyProps {
    title: React.ReactNode
    rise: string
    set: string
    altitude: string
    azimuth: string
}

// One celestial body: rise / set times and the current position in the sky
const AstroBody: React.FC<AstroBodyProps> = ({ title, rise, set, altitude, azimuth }) => {
    const { t } = useTranslation()

    const rows = [
        { label: t('components.pages.observatory.astronomy-calc.dawn', 'Восход'), value: `↑ ${rise}` },
        { label: t('components.pages.observatory.astronomy-calc.sunset', 'Закат'), value: `↓ ${set}` },
        { label: t('components.pages.observatory.astronomy-calc.height', 'Высота'), value: `${altitude}°` },
        { label: t('components.pages.observatory.astronomy-calc.azimuth', 'Азимут'), value: `${azimuth}°` }
    ]

    return (
        <div className={styles.body}>
            <h3 className={styles.name}>{title}</h3>
            <dl className={styles.parameters}>
                {rows.map(({ label, value }) => (
                    <div
                        key={label}
                        className={styles.key}
                    >
                        <dt>{label}</dt>
                        <dd className={styles.val}>{value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    )
}
