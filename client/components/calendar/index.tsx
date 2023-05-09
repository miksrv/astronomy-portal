import {
    useStatisticGetTelescopeQuery,
    useWeatherGetStatisticQuery
} from '@/api/api'
import classNames from 'classnames'
import moment, { Moment } from 'moment'
import React, { useMemo, useState } from 'react'
import { Button, Dimmer, Loader } from 'semantic-ui-react'

import RenderCalendar from './RenderCalendar'
import styles from './styles.module.sass'

type TWeatherDays = {
    good: number
    middle: number
    bad: number
}

const Calendar: React.FC = () => {
    const [calendarDate, setCalendarDate] = useState<Moment>(moment())
    const weekDayShort = moment.weekdaysShort(true)

    const { data: telescopeData, isFetching: telescopeLoading } =
        useStatisticGetTelescopeQuery({
            period: moment(calendarDate).format('MM-Y')
        })

    const { data: weatherData, isFetching: weatherLoading } =
        useWeatherGetStatisticQuery({
            period: moment(calendarDate).format('MM-Y')
        })

    const weatherDays = useMemo(() => {
        let initialData: TWeatherDays = {
            bad: 0,
            good: 0,
            middle: 0
        }

        weatherData?.weather.forEach((weather) => {
            if (weather.clouds <= 35) {
                return initialData.good++
            } else if (weather.clouds > 35 && weather.clouds <= 65) {
                return initialData.middle++
            } else {
                return initialData.bad++
            }
        })

        return initialData
    }, [weatherData?.weather])

    return (
        <div className={classNames(styles.section, 'box', 'table')}>
            <Dimmer active={telescopeLoading || weatherLoading}>
                <Loader />
            </Dimmer>
            <div className={styles.calendarToolbar}>
                <div>
                    <Button
                        size={'mini'}
                        color={'yellow'}
                        icon={'angle left'}
                        onClick={() =>
                            setCalendarDate(
                                moment(calendarDate.subtract(1, 'month'))
                            )
                        }
                    />
                    <span className={styles.currentMonth}>
                        {calendarDate.format('MMMM Y')}
                    </span>
                    <Button
                        size={'mini'}
                        color={'yellow'}
                        icon={'angle right'}
                        onClick={() =>
                            setCalendarDate(
                                moment(calendarDate.add(1, 'month'))
                            )
                        }
                    />
                </div>
                <div className={styles.dayStatistic}>
                    <div className={classNames(styles.dayNumber, styles.green)}>
                        {weatherDays.good}
                    </div>
                    <div
                        className={classNames(styles.dayNumber, styles.orange)}
                    >
                        {weatherDays.middle}
                    </div>
                    <div className={classNames(styles.dayNumber, styles.red)}>
                        {weatherDays.bad}
                    </div>
                </div>
            </div>
            <div className={styles.grid}>
                <table className={styles.calendarDay}>
                    <thead>
                        <tr>
                            {weekDayShort.map((day, key) => (
                                <th key={key}>{day}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <RenderCalendar
                            calendarDate={calendarDate}
                            eventsWeather={weatherData?.weather}
                            eventsTelescope={telescopeData?.items}
                        />
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Calendar
