import React from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { cn, Icon } from 'simple-react-ui-kit'
import SunCalc from 'suncalc'

import Image from 'next/image'

import { ApiModel } from '@/api'
import MoonPhaseIcon from '@/components/moon-phase-icon'
import SunIcon from '@/public/images/sun.png'
import { formatDate } from '@/tools/helpers'

import styles from './styles.module.sass'

const LAT = process.env.NEXT_PUBLIC_LAT ?? 51.7
const LON = process.env.NEXT_PUBLIC_LON ?? 55.2

interface RenderCalendarProps {
    calendarDate: Date | Dayjs
    eventsWeather?: ApiModel.Weather[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventsTelescope?: any[] // ApiModel.Statistic.Telescope[]
}

const RenderCalendar: React.FC<RenderCalendarProps> = (props) => {
    const { calendarDate, eventsWeather, eventsTelescope } = props

    const daysInMonth: number = dayjs(calendarDate).daysInMonth()
    const firstDayOfMonth: number = parseInt(dayjs(calendarDate).startOf('month').format('d'))
    const isCurrentMonth = dayjs(calendarDate).isSame(new Date(), 'month')

    const getWeatherClass = (cond: number | undefined) => {
        if (typeof cond === 'undefined' || cond == null) {
            return ''
        }

        if (cond <= 35) {
            return styles.green
        } else if (cond >= 36 && cond <= 65) {
            return styles.orange
        }

        return styles.red
    }

    const blanks = []
    for (let i = 1; i < (firstDayOfMonth === 0 ? 7 : firstDayOfMonth); i++) {
        blanks.push(
            <td
                key={`empty${i}`}
                className={cn(styles.calendarDay, styles.empty)}
            />
        )
    }

    const daysMonth = []
    for (let d = 1; d <= daysInMonth; d++) {
        const currentDayDate = dayjs(calendarDate)
            .startOf('month')
            .add(d - 1, 'days')

        const currentDay: boolean = isCurrentMonth && d === parseInt(formatDate(calendarDate, 'DD')!)
        const moonTimes = SunCalc.getMoonTimes(currentDayDate, LAT, LON)
        const sunTimes = SunCalc.getTimes(currentDayDate, LAT, LON)

        const itemWeatherEvent = eventsWeather?.filter((item) => currentDayDate.isSame(item.date, 'day'))?.pop()

        const itemAstroEvents = eventsTelescope?.find(({ telescope_date }) =>
            currentDayDate.isSame(telescope_date, 'day')
        )

        daysMonth.push(
            <td
                key={`day${d}`}
                className={cn(styles.calendarDay, currentDay ? styles.currentDay : undefined)}
            >
                <div
                    className={cn(styles.dayNumber, getWeatherClass(itemWeatherEvent?.clouds))}
                    // role='button'
                    // tabIndex={0}
                    // onKeyUp={() => {}}
                    // onClick={(e) => console.warn('onDayClick', e, d)}
                >
                    {d < 10 ? `0${d}` : d}
                </div>
                <div className={styles.mobileMoonIcon}>
                    <MoonPhaseIcon date={currentDayDate.toDate()} />
                </div>
                <div className={styles.moonEvent}>
                    <MoonPhaseIcon date={currentDayDate.toDate()} />

                    {moonTimes.rise && <span className={styles.rise}>{formatDate(moonTimes.rise, 'H:mm')}</span>}

                    {moonTimes.set && <span className={styles.set}>{formatDate(moonTimes.set, 'H:mm')}</span>}
                </div>

                <div className={styles.sunEvent}>
                    <Image
                        src={SunIcon}
                        className={styles.sunIcon}
                        alt={''}
                        width={16}
                        height={16}
                    />
                    {sunTimes.dawn && <span className={styles.rise}>{formatDate(sunTimes.dawn, 'H:mm')}</span>}

                    {sunTimes.dusk && <span className={styles.set}>{formatDate(sunTimes.dusk, 'H:mm')}</span>}
                </div>
                {itemWeatherEvent && (
                    <div className={styles.weatherEvent}>
                        {itemWeatherEvent.clouds != null && (
                            <span>
                                <Icon
                                    name={'Cloud'}
                                    style={{ marginRight: 5 }}
                                />
                                {Math.round(itemWeatherEvent?.clouds ?? 0)}
                            </span>
                        )}
                        <span>
                            <Icon
                                name={'Thermometer'}
                                style={{ marginRight: 0 }}
                            />
                            {itemWeatherEvent.temperature}
                        </span>
                        <span>
                            <Icon name={'Wind'} />
                            {itemWeatherEvent.windSpeed}
                        </span>
                    </div>
                )}
                {itemAstroEvents && (
                    <div className={styles.telescopeEvent}>
                        <span>
                            <Icon name={'StarEmpty'} />
                            {itemAstroEvents.catalog_items.length}
                        </span>
                        <span>
                            <Icon name={'Time'} />
                            {Math.round(itemAstroEvents.total_exposure / 60)}
                        </span>
                        <span>
                            <Icon name={'Photo'} />
                            {itemAstroEvents.frames_count}
                        </span>
                    </div>
                )}
            </td>
        )
    }

    const totalSlots = [...blanks, ...daysMonth]
    const rows: React.ReactNode[] = []
    let cells: React.ReactNode[] = []

    totalSlots.forEach((row, i) => {
        if (i % 7 !== 0) {
            cells.push(row)
        } else {
            rows.push(cells)
            cells = []
            cells.push(row)
        }
        if (i === totalSlots.length - 1) {
            rows.push(cells)
        }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((d: any, key: number) => {
        if (!d.length) {
            return null
        }

        if (d.length < 7) {
            for (let i = d.length; i < 7; i++) {
                d.push(
                    <td
                        key={`last${i as number}`}
                        className={cn(styles.calendarDay, styles.empty)}
                    ></td>
                )
            }
        }

        return <tr key={`row${key}`}>{d}</tr>
    })
}

export default RenderCalendar
