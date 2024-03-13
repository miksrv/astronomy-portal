import { ApiModel } from '@/api'
import { formatDate } from '@/functions/helpers'
import classNames from 'classnames'
import dayjs, { Dayjs } from 'dayjs'
import Image from 'next/image'
import React from 'react'
import { Icon, Popup } from 'semantic-ui-react'
import SunCalc from 'suncalc'

import MoonPhase from '@/components/moon-phase'

import SunIcon from '@/public/images/sun.png'

import styles from './styles.module.sass'

const LAT = process.env.NEXT_PUBLIC_LAT ?? 51.7
const LON = process.env.NEXT_PUBLIC_LON ?? 55.2

interface RenderCalendarProps {
    calendarDate: Date | Dayjs
    eventsWeather?: ApiModel.Statistic.Weather[]
    eventsTelescope?: ApiModel.Statistic.Telescope[]
}

const RenderCalendar: React.FC<RenderCalendarProps> = (props) => {
    const { calendarDate, eventsWeather, eventsTelescope } = props

    const daysInMonth: number = dayjs(calendarDate).daysInMonth()
    const firstDayOfMonth: number = parseInt(
        dayjs(calendarDate).startOf('month').format('d')
    )
    const isCurrentMonth = dayjs(calendarDate).isSame(new Date(), 'month')

    const getWeatherClass = (cond: number | undefined) => {
        if (typeof cond === 'undefined' || cond === null) return ''

        if (cond <= 35) return styles.green
        else if (cond >= 36 && cond <= 65) return styles.orange

        return styles.red
    }

    let blanks = []
    for (let i = 1; i < (firstDayOfMonth === 0 ? 7 : firstDayOfMonth); i++) {
        blanks.push(
            <td
                key={`empty${i}`}
                className={classNames(styles.calendarDay, styles.empty)}
            ></td>
        )
    }

    let daysMonth = []
    for (let d = 1; d <= daysInMonth; d++) {
        const currentDayDate = dayjs(calendarDate)
            .startOf('month')
            .add(d - 1, 'days')

        const currentDay: boolean =
            isCurrentMonth && d === parseInt(formatDate(calendarDate, 'DD')!)
        const moonTimes = SunCalc.getMoonTimes(currentDayDate, LAT, LON)
        const sunTimes = SunCalc.getTimes(currentDayDate, LAT, LON)

        const itemWeatherEvent = eventsWeather
            ?.filter((item) => currentDayDate.isSame(item.date, 'day'))
            ?.pop()

        const itemAstroEvents = eventsTelescope?.find(({ telescope_date }) =>
            currentDayDate.isSame(telescope_date, 'day')
        )

        daysMonth.push(
            <td
                key={`day${d}`}
                className={classNames(
                    styles.calendarDay,
                    currentDay ? styles.currentDay : undefined
                )}
            >
                <div
                    className={classNames(
                        styles.dayNumber,
                        getWeatherClass(itemWeatherEvent?.clouds)
                    )}
                    // role='button'
                    // tabIndex={0}
                    // onKeyUp={() => {}}
                    // onClick={(e) => console.warn('onDayClick', e, d)}
                >
                    {d < 10 ? `0${d}` : d}
                </div>
                <div className={styles.mobileMoonIcon}>
                    <MoonPhase date={currentDayDate.toDate()} />
                </div>
                <div className={styles.moonEvent}>
                    <MoonPhase date={currentDayDate.toDate()} />

                    {moonTimes.rise && (
                        <span className={styles.rise}>
                            {formatDate(moonTimes.rise, 'H:mm')}
                        </span>
                    )}

                    {moonTimes.set && (
                        <span className={styles.set}>
                            {formatDate(moonTimes.set, 'H:mm')}
                        </span>
                    )}
                </div>

                <div className={styles.sunEvent}>
                    <Image
                        src={SunIcon}
                        className={styles.sunIcon}
                        alt={''}
                        width={16}
                        height={16}
                    />
                    {sunTimes.dawn && (
                        <span className={styles.rise}>
                            {formatDate(sunTimes.dawn, 'H:mm')}
                        </span>
                    )}

                    {sunTimes.dusk && (
                        <span className={styles.set}>
                            {formatDate(sunTimes.dusk, 'H:mm')}
                        </span>
                    )}
                </div>
                {itemWeatherEvent && (
                    <div className={styles.weatherEvent}>
                        {itemWeatherEvent.clouds !== null && (
                            <span>
                                <Icon
                                    name={'cloud'}
                                    style={{ marginRight: 5 }}
                                />
                                {Math.round(itemWeatherEvent.clouds)}
                            </span>
                        )}
                        <span>
                            <Icon
                                name={'thermometer'}
                                style={{ marginRight: 0 }}
                            />
                            {itemWeatherEvent.temperature}
                        </span>
                        <span>
                            <Icon name={'send'} />
                            {itemWeatherEvent.wind_speed}
                        </span>
                    </div>
                )}
                {itemAstroEvents && (
                    <Popup
                        content={itemAstroEvents.catalog_items.join(', ')}
                        size='mini'
                        trigger={
                            <div className={styles.telescopeEvent}>
                                <span>
                                    <Icon name='star outline' />
                                    {itemAstroEvents.catalog_items.length}
                                </span>
                                <span>
                                    <Icon name='clock outline' />
                                    {Math.round(
                                        itemAstroEvents.total_exposure / 60
                                    )}
                                </span>
                                <span>
                                    <Icon name='image outline' />
                                    {itemAstroEvents.frames_count}
                                </span>
                            </div>
                        }
                    />
                )}
            </td>
        )
    }

    let totalSlots = [...blanks, ...daysMonth]
    let rows: any = []
    let cells: any = []

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

    return rows.map((d: any, key: number) => {
        if (!d.length) return null

        if (d.length < 7) {
            for (let i = d.length; i < 7; i++) {
                d.push(
                    <td
                        key={`last${i}`}
                        className={classNames(styles.calendarDay, styles.empty)}
                    ></td>
                )
            }
        }

        return <tr key={`row${key}`}>{d}</tr>
    })
}

export default RenderCalendar
