import {
    useStatisticGetTelescopeQuery,
    useWeatherGetStatisticQuery
} from '@/api/api'
import classNames from 'classnames'
import moment, { Moment } from 'moment'
import React, { useState } from 'react'
import { Button, Dimmer, Loader } from 'semantic-ui-react'

import RenderCalendar from './RenderCalendar'
import styles from './styles.module.sass'

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

    return (
        <div className={classNames(styles.calendar, 'box', 'table')}>
            <Dimmer active={telescopeLoading || weatherLoading}>
                <Loader />
            </Dimmer>
            <div className={styles.calendarToolbar}>
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
                        setCalendarDate(moment(calendarDate.add(1, 'month')))
                    }
                />
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
