import { ApiModel } from '@/api'
import { APIMeteo } from '@/api/apiMeteo'
import { dateAddMonth, dateExtractMonth, formatDate } from '@/functions/helpers'
import classNames from 'classnames'
import dayjs from 'dayjs'
import React, { useMemo, useState } from 'react'
import { Button, Dimmer, Loader } from 'semantic-ui-react'

import RenderCalendar from './RenderCalendar'
import styles from './styles.module.sass'

type WeatherDaysType = {
    good: number
    middle: number
    bad: number
}

interface CalendarProps {
    eventsTelescope?: ApiModel.Statistic.Telescope[]
}

const Calendar: React.FC<CalendarProps> = ({ eventsTelescope }) => {
    const [calendarDate, setCalendarDate] = useState<Date>(new Date())
    const daysOfWeek = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

    const { data: weatherData, isFetching: weatherLoading } =
        APIMeteo.useGetHistoryQuery({
            end_date: dayjs(calendarDate).isSame(dayjs(), 'month')
                ? dayjs().format('YYYY-MM-DD')
                : dayjs(calendarDate).endOf('month').format('YYYY-MM-DD'),
            start_date:
                dayjs(calendarDate).startOf('month').format('YYYY-MM-DD') ?? ''
        })

    const weatherDays = useMemo(() => {
        let initialData: WeatherDaysType = {
            bad: 0,
            good: 0,
            middle: 0
        }

        weatherData?.forEach((weather) => {
            if (typeof weather?.clouds !== 'undefined') {
                if (weather?.clouds <= 35) {
                    return initialData.good++
                } else if (weather?.clouds > 35 && weather?.clouds <= 65) {
                    return initialData.middle++
                } else {
                    return initialData.bad++
                }
            }
        })

        return initialData
    }, [weatherData])

    return (
        <div className={classNames(styles.section, 'box', 'table')}>
            <Dimmer active={weatherLoading}>
                <Loader />
            </Dimmer>
            <div className={styles.calendarToolbar}>
                <div>
                    <Button
                        size={'mini'}
                        color={'yellow'}
                        icon={'angle left'}
                        onClick={() =>
                            setCalendarDate(dateExtractMonth(calendarDate, 1))
                        }
                    />
                    <span className={styles.currentMonth}>
                        {formatDate(calendarDate, 'MMMM YYYY')}
                    </span>
                    <Button
                        size={'mini'}
                        color={'yellow'}
                        icon={'angle right'}
                        onClick={() =>
                            setCalendarDate(dateAddMonth(calendarDate, 1))
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
                            {daysOfWeek.map((day, key) => (
                                <th key={key}>{day}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <RenderCalendar
                            calendarDate={calendarDate}
                            eventsWeather={weatherData}
                            eventsTelescope={eventsTelescope}
                        />
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Calendar
