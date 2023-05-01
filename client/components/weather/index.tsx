import { useWeatherGetCurrentQuery } from '@/api/api'
import { timeAgo } from '@/functions/helpers'
import classNames from 'classnames'
import moment from 'moment'
import React from 'react'
import { Dimmer, Grid, Loader } from 'semantic-ui-react'

import styles from './styles.module.sass'

const getRange = (value: number | null, min: number, max: number): number => {
    if (value === null) return 3

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

const Weather: React.FC = () => {
    const { data, isLoading } = useWeatherGetCurrentQuery()

    const lastUpdate = data ? data.timestamp.server - data.timestamp.update : 0

    const rangeTemp = data ? getRange(data.conditions.temperature, -24, 24) : 3
    const rangeHumd = data ? getRange(data.conditions.humidity, 0, 75) : 3
    const rangeCloud = data ? getRange(data.conditions.clouds, 0, 50) : 3
    const rangeWind = data ? getRange(data.conditions.wind_speed, 0, 10) : 3
    const rangeRain = data
        ? getRange(data.conditions.precipitation, 0.1, 0.1)
        : 3
    const rangeGust = data ? getRange(data.conditions.precipitation, 0, 8) : 3

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
        weatherCondition = 'Безопасно'
    } else if (
        rangeTemp === 2 ||
        rangeHumd === 2 ||
        rangeCloud === 2 ||
        rangeWind === 2 ||
        rangeRain === 2 ||
        rangeGust === 2
    ) {
        weatherState = 2
        weatherCondition = 'Критическое'
    } else {
        weatherState = 1
        weatherCondition = 'Опасно'
    }

    return (
        <div className={classNames(styles.weather, 'box')}>
            <Dimmer active={isLoading}>
                <Loader />
            </Dimmer>
            <h4 className={styles.blockTitle}>
                Состояние погоды:
                <span className={styles['state' + weatherState]}>
                    {weatherCondition}
                </span>
            </h4>
            <div className={classNames(styles.update, 'small')}>
                Обновлено:{' '}
                <strong>
                    {data
                        ? moment
                              .unix(data.timestamp.update)
                              .format('DD.MM.Y, H:mm:ss')
                        : 'Загрузка...'}
                </strong>{' '}
                ({timeAgo(lastUpdate)})
            </div>
            <Grid className={styles.grid}>
                <Grid.Column
                    computer={8}
                    tablet={8}
                    mobile={16}
                    className={styles.column}
                >
                    <div className={styles.key}>
                        <span className={styles['weatherState' + rangeTemp]} />
                        Температура:
                        <span className={styles.val}>
                            {data?.conditions.temperature}℃
                        </span>
                    </div>
                </Grid.Column>
                <Grid.Column
                    computer={8}
                    tablet={8}
                    mobile={16}
                    className={styles.column}
                >
                    <div className={styles.key}>
                        <span className={styles['weatherState' + rangeHumd]} />
                        Влажность:
                        <span className={styles.val}>
                            {data?.conditions.humidity || '?'}%
                        </span>
                    </div>
                </Grid.Column>
                <Grid.Column
                    computer={8}
                    tablet={8}
                    mobile={16}
                    className={styles.column}
                >
                    <div className={styles.key}>
                        <span className={styles['weatherState' + rangeCloud]} />
                        Облачность:
                        <span className={styles.val}>
                            {data?.conditions.clouds || '?'}%
                        </span>
                    </div>
                </Grid.Column>
                <Grid.Column
                    computer={8}
                    tablet={8}
                    mobile={16}
                    className={styles.column}
                >
                    <div className={styles.key}>
                        <span className={styles['weatherState' + rangeWind]} />
                        Скорость ветра:
                        <span className={styles.val}>
                            {data?.conditions.wind_speed || '?'} м\с
                        </span>
                    </div>
                </Grid.Column>
                <Grid.Column
                    computer={8}
                    tablet={8}
                    mobile={16}
                    className={styles.column}
                >
                    <div className={styles.key}>
                        <span className={styles['weatherState' + rangeRain]} />
                        Осадки:
                        <span className={styles.val}>
                            {data?.conditions.precipitation} мм
                        </span>
                    </div>
                </Grid.Column>
                <Grid.Column
                    computer={8}
                    tablet={8}
                    mobile={16}
                    className={styles.column}
                >
                    <div className={styles.key}>
                        <span className={styles['weatherState' + rangeGust]} />
                        Порывы ветра:
                        <span className={styles.val}>
                            {data?.conditions.wind_gust || '?'} м\с
                        </span>
                    </div>
                </Grid.Column>
            </Grid>
        </div>
    )
}

export default Weather
