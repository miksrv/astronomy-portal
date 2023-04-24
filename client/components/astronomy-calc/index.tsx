import classNames from 'classnames'
import moment from 'moment'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { Grid } from 'semantic-ui-react'
import SunCalc from 'suncalc'

import MoonPhase from '@/components/moon-phase'

import SunIcon from '@/public/images/sun.png'

import styles from './styles.module.sass'

const LAT = 51.7
const LON = 55.2

const AstronomyCalc: React.FC = () => {
    const moonTimes = SunCalc.getMoonTimes(moment(), LAT, LON)
    const sunTimes = SunCalc.getTimes(moment(), LAT, LON)

    const [sunAltitude, setSunAltitude] = useState<string>('00.000')
    const [sunAzimuth, setSunAzimuth] = useState<string>('00.000')
    const [moonAltitude, setMoonAltitude] = useState<string>('00.000')
    const [moonAzimuth, setMoonAzimuth] = useState<string>('00.000')

    const tick = () => {
        const sunPosition = SunCalc.getPosition(moment(), LAT, LON)
        const moonPosition = SunCalc.getMoonPosition(moment(), LAT, LON)

        setSunAltitude(((sunPosition.altitude * 180) / Math.PI).toFixed(3))
        setSunAzimuth(((sunPosition.azimuth * 180) / Math.PI).toFixed(3))

        setMoonAltitude(((moonPosition.altitude * 180) / Math.PI).toFixed(3))
        setMoonAzimuth(((moonPosition.azimuth * 180) / Math.PI).toFixed(3))
    }

    useEffect(() => {
        const timer = setInterval(() => tick(), 1000)

        return () => clearInterval(timer)
    })

    return (
        <div className={classNames(styles.astronomyCalc, 'box')}>
            <Grid>
                <Grid.Column width={8}>
                    <h4 className={styles.sectionTitle}>
                        <Image
                            src={SunIcon}
                            className={styles.icon}
                            alt={''}
                            width={16}
                            height={16}
                        />
                        Положение Солнца
                    </h4>
                    <div className={styles.key}>
                        ↑ Окончание сумерек:
                        <span className={styles.val}>
                            {moment(sunTimes.dawn).format('H:mm')}
                        </span>
                    </div>
                    <div className={styles.key}>
                        ↓ Начало сумерек:
                        <span className={styles.val}>
                            {moment(sunTimes.dusk).format('H:mm')}
                        </span>
                    </div>
                    <div className={styles.key}>
                        Высота:
                        <span className={styles.val}>{sunAltitude}°</span>
                    </div>
                    <div className={styles.key}>
                        Азимут:
                        <span className={styles.val}>{sunAzimuth}°</span>
                    </div>
                </Grid.Column>
                <Grid.Column width={8}>
                    <h4 className={styles.sectionTitle}>
                        <MoonPhase date={moment()} /> Положение Луны
                    </h4>
                    <div className={styles.key}>
                        ↑ Восход:
                        <span className={styles.val}>
                            {moment(moonTimes.rise).format('H:mm')}
                        </span>
                    </div>
                    <div className={styles.key}>
                        ↓ Закат:
                        <span className={styles.val}>
                            {moment(moonTimes.set).format('H:mm')}
                        </span>
                    </div>
                    <div className={styles.key}>
                        Высота:
                        <span className={styles.val}>{moonAltitude}°</span>
                    </div>
                    <div className={styles.key}>
                        Азимут:
                        <span className={styles.val}>{moonAzimuth}°</span>
                    </div>
                </Grid.Column>
            </Grid>
        </div>
    )
}

export default AstronomyCalc
