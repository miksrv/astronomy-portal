import { TFilesMonth, TWeatherMonth } from '@/api/types'
import classNames from 'classnames'
import moment, { Moment } from 'moment'
import React, { useState } from 'react'
import { Button, Dimmer, Loader } from 'semantic-ui-react'

import RenderCalendar from './RenderCalendar'
import styles from './styles.module.sass'

type TCalendarProps = {
    loading: boolean
    eventsWeather: TWeatherMonth[]
    eventsTelescope: TFilesMonth[]
    changeDate: (date: Moment) => void
}

const Calendar: React.FC<TCalendarProps> = (props) => {
    const { loading, eventsWeather, eventsTelescope, changeDate } = props
    const [dateObject, setDateObject] = useState<Moment>(moment())
    const weekDayShort = moment.weekdaysShort(true)

    const handleChangeDate = (date: Moment) => {
        setDateObject(date)
        changeDate(date)
    }

    return (
        <div className={classNames(styles.calendar, 'box', 'table')}>
            {loading && (
                <Dimmer active>
                    <Loader />
                </Dimmer>
            )}
            <div className={styles.calendarToolbar}>
                <Button
                    size={'mini'}
                    color={'green'}
                    icon={'angle left'}
                    onClick={() =>
                        handleChangeDate(
                            moment(dateObject.subtract(1, 'month'))
                        )
                    }
                />
                <span className={styles.currentMonth}>
                    {dateObject.format('MMMM Y')}
                </span>
                <Button
                    size={'mini'}
                    color={'green'}
                    icon={'angle right'}
                    onClick={() =>
                        handleChangeDate(moment(dateObject.add(1, 'month')))
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
                            dateObject={dateObject}
                            eventsWeather={eventsWeather}
                            eventsTelescope={eventsTelescope}
                        />
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Calendar
