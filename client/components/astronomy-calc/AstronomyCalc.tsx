import React, { useEffect, useState } from 'react'
import { Container } from 'simple-react-ui-kit'
import SunCalc from 'suncalc'

import Image from 'next/image'
import { useTranslation } from 'next-i18next'

import MoonPhaseIcon from '@/components/moon-phase-icon'
import { formatDate } from '@/tools/helpers'

import styles from './styles.module.sass'

const LAT = process.env.NEXT_PUBLIC_LAT ?? 51.7
const LON = process.env.NEXT_PUBLIC_LON ?? 55.2

const AstronomyCalc: React.FC = () => {
    const { t } = useTranslation()

    const currentDate = new Date()
    const moonTimes = SunCalc.getMoonTimes(currentDate, LAT, LON)
    const sunTimes = SunCalc.getTimes(currentDate, LAT, LON)

    const [sunAltitude, setSunAltitude] = useState<string>('00')
    const [sunAzimuth, setSunAzimuth] = useState<string>('00')
    const [moonAltitude, setMoonAltitude] = useState<string>('00')
    const [moonAzimuth, setMoonAzimuth] = useState<string>('00')

    const tick = () => {
        const sunPosition = SunCalc.getPosition(currentDate, LAT, LON)
        const moonPosition = SunCalc.getMoonPosition(currentDate, LAT, LON)

        setSunAltitude(((sunPosition.altitude * 180) / Math.PI).toFixed(0))
        setSunAzimuth(((sunPosition.azimuth * 180) / Math.PI).toFixed(0))

        setMoonAltitude(((moonPosition.altitude * 180) / Math.PI).toFixed(0))
        setMoonAzimuth(((moonPosition.azimuth * 180) / Math.PI).toFixed(0))
    }

    useEffect(() => {
        const timer = setInterval(() => tick(), 1000)

        return () => clearInterval(timer)
    })

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
                    {t('sun')}
                </strong>
                <div className={styles.parameters}>
                    <div className={styles.key}>
                        {t('dawn')}
                        {':'}
                        <span className={styles.val}>
                            {'↑'}
                            {formatDate(sunTimes.dawn, 'H:mm')}
                        </span>
                    </div>
                    <div className={styles.key}>
                        {t('sunset')}
                        {':'}
                        <span className={styles.val}>
                            {'↓'}
                            {formatDate(sunTimes.dusk, 'H:mm')}
                        </span>
                    </div>
                </div>
                <div className={styles.parameters}>
                    <div className={styles.key}>
                        {t('height')}
                        {':'}
                        <span className={styles.val}>
                            {sunAltitude}
                            {'°'}
                        </span>
                    </div>
                    <div className={styles.key}>
                        {t('azimuth')}
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
                    <MoonPhaseIcon date={currentDate.toDateString()} /> {t('moon')}
                </strong>
                <div className={styles.parameters}>
                    <div className={styles.key}>
                        {t('dawn')}
                        {':'}
                        <span className={styles.val}>
                            {'↑'}
                            {formatDate(moonTimes.rise, 'H:mm')}
                        </span>
                    </div>
                    <div className={styles.key}>
                        {t('sunset')}
                        {':'}
                        <span className={styles.val}>
                            {'↓'}
                            {formatDate(moonTimes.set, 'H:mm')}
                        </span>
                    </div>
                </div>
                <div className={styles.parameters}>
                    <div className={styles.key}>
                        {t('height')}
                        {':'}
                        <span className={styles.val}>
                            {moonAltitude}
                            {'°'}
                        </span>
                    </div>
                    <div className={styles.key}>
                        {t('azimuth')}
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

export default AstronomyCalc
