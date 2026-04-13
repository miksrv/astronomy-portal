import React, { useEffect, useState } from 'react'
import { Container } from 'simple-react-ui-kit'
import SunCalc from 'suncalc'

import Image from 'next/image'
import { useTranslation } from 'next-i18next'

import { MoonPhaseIcon } from '@/components/common'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

const LAT = process.env.NEXT_PUBLIC_LAT ?? 51.7
const LON = process.env.NEXT_PUBLIC_LON ?? 55.2

type AstroData = {
    sunAltitude: string
    sunAzimuth: string
    moonAltitude: string
    moonAzimuth: string
    sunTimes: ReturnType<typeof SunCalc.getTimes>
    moonTimes: ReturnType<typeof SunCalc.getMoonTimes>
    currentDate: Date
}

const computeAstroData = (): AstroData => {
    const now = new Date()
    const sunPosition = SunCalc.getPosition(now, LAT, LON)
    const moonPosition = SunCalc.getMoonPosition(now, LAT, LON)

    return {
        currentDate: now,
        moonAltitude: ((moonPosition.altitude * 180) / Math.PI).toFixed(0),
        moonAzimuth: ((moonPosition.azimuth * 180) / Math.PI).toFixed(0),
        moonTimes: SunCalc.getMoonTimes(now, LAT, LON),
        sunAltitude: ((sunPosition.altitude * 180) / Math.PI).toFixed(0),
        sunAzimuth: ((sunPosition.azimuth * 180) / Math.PI).toFixed(0),
        sunTimes: SunCalc.getTimes(now, LAT, LON)
    }
}

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

    return (
        <Container className={styles.astronomyCalc}>
            <div className={styles.container}>
                <strong>
                    <Image
                        src={'/images/sun.png'}
                        className={styles.icon}
                        alt={''}
                        width={16}
                        height={16}
                    />
                    {t('components.pages.observatory.astronomy-calc.sun', 'Солнце')}
                </strong>
                <div className={styles.parameters}>
                    <div className={styles.key}>
                        {t('components.pages.observatory.astronomy-calc.dawn', 'Восход')}
                        {':'}
                        <span className={styles.val}>
                            {'↑'}
                            {formatDate(sunTimes.dawn, 'H:mm')}
                        </span>
                    </div>
                    <div className={styles.key}>
                        {t('components.pages.observatory.astronomy-calc.sunset', 'Закат')}
                        {':'}
                        <span className={styles.val}>
                            {'↓'}
                            {formatDate(sunTimes.dusk, 'H:mm')}
                        </span>
                    </div>
                </div>
                <div className={styles.parameters}>
                    <div className={styles.key}>
                        {t('components.pages.observatory.astronomy-calc.height', 'Высота')}
                        {':'}
                        <span className={styles.val}>
                            {sunAltitude}
                            {'°'}
                        </span>
                    </div>
                    <div className={styles.key}>
                        {t('components.pages.observatory.astronomy-calc.azimuth', 'Азимут')}
                        {':'}
                        <span className={styles.val}>
                            {sunAzimuth}
                            {'°'}
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.container}>
                <strong>
                    <MoonPhaseIcon date={currentDate.toDateString()} />{' '}
                    {t('components.pages.observatory.astronomy-calc.moon', 'Луна')}
                </strong>
                <div className={styles.parameters}>
                    <div className={styles.key}>
                        {t('components.pages.observatory.astronomy-calc.dawn', 'Восход')}
                        {':'}
                        <span className={styles.val}>
                            {'↑'}
                            {formatDate(moonTimes.rise, 'H:mm')}
                        </span>
                    </div>
                    <div className={styles.key}>
                        {t('components.pages.observatory.astronomy-calc.sunset', 'Закат')}
                        {':'}
                        <span className={styles.val}>
                            {'↓'}
                            {formatDate(moonTimes.set, 'H:mm')}
                        </span>
                    </div>
                </div>
                <div className={styles.parameters}>
                    <div className={styles.key}>
                        {t('components.pages.observatory.astronomy-calc.height', 'Высота')}
                        {':'}
                        <span className={styles.val}>
                            {moonAltitude}
                            {'°'}
                        </span>
                    </div>
                    <div className={styles.key}>
                        {t('components.pages.observatory.astronomy-calc.azimuth', 'Азимут')}
                        {':'}
                        <span className={styles.val}>
                            {moonAzimuth}
                            {'°'}
                        </span>
                    </div>
                </div>
            </div>
        </Container>
    )
}
