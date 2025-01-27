import { APIMeteo } from '@/api/apiMeteo'
import { formatDateUTC, minutesAgo } from '@/functions/helpers'
import { useTranslation } from 'next-i18next'
import React from 'react'
import { Container } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

const Weather: React.FC = () => {
    const { t } = useTranslation()

    const { data, isLoading } = APIMeteo.useGetCurrentQuery()

    const getRange = (
        value?: number,
        min: number = 0,
        max: number = 10
    ): number => {
        if (typeof value === 'undefined') return 3

        const percent = 15
        const calcVal = value * (1 + percent / 100)

        if (value === 0) {
            return 0
        } else if (value > max || value < min) {
            return 2
        } else if (calcVal > max || calcVal < min) {
            return 1
        }

        return 0
    }

    const rangeTemp = getRange(data?.temperature, -24, 24)
    const rangeHumd = getRange(data?.humidity, 0, 90)
    const rangeCloud = getRange(data?.clouds, 0, 50)
    const rangeWind = getRange(data?.windSpeed, 0, 10)
    const rangeRain = getRange(data?.precipitation, 0.1, 0.1)
    const rangeGust = getRange(data?.windGust, 0, 8)

    let weatherState: number
    let weatherCondition: string

    if (
        rangeTemp === 0 &&
        rangeHumd === 0 &&
        rangeCloud === 0 &&
        rangeWind === 0 &&
        rangeRain === 0 &&
        rangeGust === 0
    ) {
        weatherState = 0
        weatherCondition = t('safely')
    } else if (
        rangeTemp === 2 ||
        rangeHumd === 2 ||
        rangeCloud === 2 ||
        rangeWind === 2 ||
        rangeRain === 2 ||
        rangeGust === 2
    ) {
        weatherState = 2
        weatherCondition = t('critical')
    } else {
        weatherState = 1
        weatherCondition = t('dangerous')
    }

    return (
        <Container className={styles.weather}>
            <h4 className={styles.blockTitle}>
                {t('weather-conditions')}
                {':'}
                <span className={styles['state' + weatherState]}>
                    {weatherCondition}
                </span>
            </h4>
            <div className={styles.update}>
                {t('updated')}
                {':'}
                <strong>
                    {!isLoading ? formatDateUTC(data?.date) : t('loading')}
                </strong>
                {data?.date && `(${minutesAgo(data.date)})`}
            </div>
            <div className={styles.grid}>
                <div className={styles.key}>
                    <span className={styles['weatherState' + rangeTemp]} />
                    {t('temperature')}
                    {':'}
                    <span className={styles.val}>
                        {data?.temperature || ''}
                        {'℃'}
                    </span>
                </div>
                <div className={styles.key}>
                    <span className={styles['weatherState' + rangeHumd]} />
                    {t('humidity')}
                    {':'}
                    <span className={styles.val}>
                        {data?.humidity || '?'}
                        {'%'}
                    </span>
                </div>
                <div className={styles.key}>
                    <span className={styles['weatherState' + rangeCloud]} />
                    {t('cloudiness')}
                    {':'}
                    <span className={styles.val}>
                        {data?.clouds || '?'}
                        {'%'}
                    </span>
                </div>
                <div className={styles.key}>
                    <span className={styles['weatherState' + rangeWind]} />
                    {t('wind-speed')}
                    {':'}
                    <span className={styles.val}>
                        {data?.windSpeed || '?'} {'м\\с'}
                    </span>
                </div>
                <div className={styles.key}>
                    <span className={styles['weatherState' + rangeRain]} />
                    {t('precipitation')}
                    {':'}
                    <span className={styles.val}>
                        {data?.precipitation || '?'} {'мм'}
                    </span>
                </div>
                <div className={styles.key}>
                    <span className={styles['weatherState' + rangeGust]} />
                    {t('gusts-of-wind')}
                    {':'}
                    <span className={styles.val}>
                        {data?.windGust || '?'} {'м\\с'}
                    </span>
                </div>
            </div>
        </Container>
    )
}

export default Weather
