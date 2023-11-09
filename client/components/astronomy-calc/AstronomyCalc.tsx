import { formatDate } from '@/functions/helpers'
import classNames from 'classnames'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { Grid } from 'semantic-ui-react'
import SunCalc from 'suncalc'

import MoonPhase from '@/components/moon-phase'

import styles from './styles.module.sass'

const LAT = process.env.NEXT_PUBLIC_LAT ?? 51.7
const LON = process.env.NEXT_PUBLIC_LON ?? 55.2

const AstronomyCalc: React.FC = () => {
    const currentDate = new Date()
    const moonTimes = SunCalc.getMoonTimes(currentDate, LAT, LON)
    const sunTimes = SunCalc.getTimes(currentDate, LAT, LON)

    const [sunAltitude, setSunAltitude] = useState<string>('00.000')
    const [sunAzimuth, setSunAzimuth] = useState<string>('00.000')
    const [moonAltitude, setMoonAltitude] = useState<string>('00.000')
    const [moonAzimuth, setMoonAzimuth] = useState<string>('00.000')

    const tick = () => {
        const sunPosition = SunCalc.getPosition(currentDate, LAT, LON)
        const moonPosition = SunCalc.getMoonPosition(currentDate, LAT, LON)

        setSunAltitude(((sunPosition.altitude * 180) / Math.PI).toFixed(2))
        setSunAzimuth(((sunPosition.azimuth * 180) / Math.PI).toFixed(2))

        setMoonAltitude(((moonPosition.altitude * 180) / Math.PI).toFixed(2))
        setMoonAzimuth(((moonPosition.azimuth * 180) / Math.PI).toFixed(2))
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
                            src={'/images/sun.png'}
                            className={styles.icon}
                            alt={''}
                            width={16}
                            height={16}
                        />
                        Солнце
                    </h4>
                    <Grid className={styles.columnTable}>
                        <Grid.Column
                            computer={7}
                            mobile={16}
                        >
                            <div className={styles.key}>
                                {'↑ Рассвет:'}
                                <span className={styles.val}>
                                    {formatDate(sunTimes.dawn, 'H:mm')}
                                </span>
                            </div>
                        </Grid.Column>
                        <Grid.Column
                            computer={8}
                            mobile={16}
                        >
                            <div className={styles.key}>
                                {'↓ Закат:'}
                                <span className={styles.val}>
                                    {formatDate(sunTimes.dusk, 'H:mm')}
                                </span>
                            </div>
                        </Grid.Column>
                        <Grid.Column
                            computer={7}
                            mobile={16}
                        >
                            <div className={styles.key}>
                                {'Высота:'}
                                <span className={styles.val}>
                                    {sunAltitude}°
                                </span>
                            </div>
                        </Grid.Column>
                        <Grid.Column
                            computer={8}
                            mobile={16}
                        >
                            <div className={styles.key}>
                                {'Азимут:'}
                                <span className={styles.val}>
                                    {sunAzimuth}°
                                </span>
                            </div>
                        </Grid.Column>
                    </Grid>
                </Grid.Column>
                <Grid.Column width={8}>
                    <h4 className={styles.sectionTitle}>
                        <MoonPhase date={currentDate} /> Луна
                    </h4>
                    <Grid className={styles.columnTable}>
                        <Grid.Column
                            computer={7}
                            mobile={16}
                        >
                            <div className={styles.key}>
                                {'↑ Восход:'}
                                <span className={styles.val}>
                                    {formatDate(moonTimes.rise, 'H:mm')}
                                </span>
                            </div>
                        </Grid.Column>
                        <Grid.Column
                            computer={8}
                            mobile={16}
                        >
                            <div className={styles.key}>
                                {'↓ Закат:'}
                                <span className={styles.val}>
                                    {formatDate(moonTimes.set, 'H:mm')}
                                </span>
                            </div>
                        </Grid.Column>
                        <Grid.Column
                            computer={7}
                            mobile={16}
                        >
                            <div className={styles.key}>
                                {'Высота:'}
                                <span className={styles.val}>
                                    {moonAltitude}°
                                </span>
                            </div>
                        </Grid.Column>
                        <Grid.Column
                            computer={8}
                            mobile={16}
                        >
                            <div className={styles.key}>
                                {'Азимут:'}
                                <span className={styles.val}>
                                    {moonAzimuth}°
                                </span>
                            </div>
                        </Grid.Column>
                    </Grid>
                </Grid.Column>
            </Grid>
        </div>
    )
}

export default AstronomyCalc
