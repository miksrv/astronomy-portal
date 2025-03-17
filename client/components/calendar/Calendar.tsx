import { APIMeteo } from '@/api'
import { dateAddMonth, dateExtractMonth, formatDate } from '@/tools/helpers'
import dayjs from 'dayjs'
import React, { useState } from 'react'
import { Button, Container } from 'simple-react-ui-kit'

import RenderCalendar from './RenderCalendar'
import styles from './styles.module.sass'

interface CalendarProps {
    eventsTelescope?: any[] // ApiModel.Statistic.Telescope[]
}

const Calendar: React.FC<CalendarProps> = ({ eventsTelescope }) => {
    const [calendarDate, setCalendarDate] = useState<Date>(new Date())
    const daysOfWeek = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

    const { data: weatherData } = APIMeteo.useGetHistoryQuery({
        end_date: dayjs(calendarDate).isSame(dayjs(), 'month')
            ? dayjs().format('YYYY-MM-DD')
            : dayjs(calendarDate).endOf('month').format('YYYY-MM-DD'),
        start_date:
            dayjs(calendarDate).startOf('month').format('YYYY-MM-DD') ?? ''
    })

    return (
        <Container className={styles.section}>
            <div className={styles.calendarToolbar}>
                <Button
                    mode={'secondary'}
                    icon={'KeyboardLeft'}
                    onClick={() =>
                        setCalendarDate(dateExtractMonth(calendarDate, 1))
                    }
                />
                <span className={styles.currentMonth}>
                    {formatDate(calendarDate, 'MMMM YYYY')}
                </span>
                <Button
                    mode={'secondary'}
                    icon={'KeyboardRight'}
                    onClick={() =>
                        setCalendarDate(dateAddMonth(calendarDate, 1))
                    }
                />
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
        </Container>
    )
}

export default Calendar
