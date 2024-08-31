import { APIMeteo } from '@/api/apiMeteo'
import { formatDateUTC, minutesAgo } from '@/functions/helpers'
import classNames from 'classnames'
import React from 'react'
import { Dimmer, Grid, Loader } from 'semantic-ui-react'

import styles from './styles.module.sass'

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

const Weather: React.FC = () => {
    const { data, isLoading } = APIMeteo.useGetCurrentQuery()

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
                    {!isLoading ? formatDateUTC(data?.date) : 'Загрузка...'}
                </strong>{' '}
                {data?.date && `(${minutesAgo(data.date)})`}
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
                            {data?.temperature ?? ''}℃
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
                            {data?.humidity ?? '?'}%
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
                            {data?.clouds ?? '?'}%
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
                            {data?.windSpeed ?? '?'} м\с
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
                            {data?.precipitation ?? '?'} мм
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
                            {data?.windGust ?? '?'} м\с
                        </span>
                    </div>
                </Grid.Column>
            </Grid>
        </div>
    )
}

export default Weather
