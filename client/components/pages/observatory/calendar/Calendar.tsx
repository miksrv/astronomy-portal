import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Button, Container } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { APIMeteo } from '@/api'
import { formatDate } from '@/utils/dates'
import { dateAddMonth, dateExtractMonth } from '@/utils/helpers'

import RenderCalendar from './RenderCalendar'

import styles from './styles.module.sass'

interface CalendarProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventsTelescope?: any[] // ApiModel.Statistic.Telescope[]
}

export const Calendar: React.FC<CalendarProps> = ({ eventsTelescope }) => {
    const { t, i18n } = useTranslation()
    const [calendarDate, setCalendarDate] = useState<Date>(new Date())
    // Short weekday names in the current language, week starts on Monday
    const daysOfWeek = useMemo(
        () => [1, 2, 3, 4, 5, 6, 0].map((day) => dayjs().day(day).locale(i18n.language).format('dd')),
        [i18n.language]
    )

    const { data: weatherData } = APIMeteo.useGetHistoryQuery({
        end_date: dayjs(calendarDate).isSame(dayjs(), 'month')
            ? dayjs().format('YYYY-MM-DD')
            : dayjs(calendarDate).endOf('month').format('YYYY-MM-DD'),
        start_date: dayjs(calendarDate).startOf('month').format('YYYY-MM-DD') ?? ''
    })

    return (
        <Container className={styles.section}>
            <div className={styles.calendarToolbar}>
                <Button
                    mode={'secondary'}
                    icon={'KeyboardLeft'}
                    aria-label={t('components.pages.observatory.calendar.previous-month', 'Предыдущий месяц')}
                    onClick={() => setCalendarDate(dateExtractMonth(calendarDate, 1))}
                />
                <span
                    className={styles.currentMonth}
                    aria-live={'polite'}
                >
                    {formatDate(calendarDate, 'MMMM YYYY')}
                </span>
                <Button
                    mode={'secondary'}
                    icon={'KeyboardRight'}
                    aria-label={t('components.pages.observatory.calendar.next-month', 'Следующий месяц')}
                    onClick={() => setCalendarDate(dateAddMonth(calendarDate, 1))}
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
