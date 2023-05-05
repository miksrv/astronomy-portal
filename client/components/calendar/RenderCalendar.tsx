import { TStatisticTelescope, TWeatherStatistic } from '@/api/types'
import { isMobile } from '@/functions/helpers'
import classNames from 'classnames'
import moment, { Moment } from 'moment'
import Image from 'next/image'
import React from 'react'
import { Icon, Popup } from 'semantic-ui-react'
import SunCalc from 'suncalc'

import MoonPhase from '@/components/moon-phase'

import SunIcon from '@/public/images/sun.png'

import styles from './styles.module.sass'

type TRenderCalendarProps = {
    calendarDate: Moment
    eventsWeather?: TWeatherStatistic[]
    eventsTelescope?: TStatisticTelescope[]
}

const RenderCalendar: React.FC<TRenderCalendarProps> = (props) => {
    const { calendarDate, eventsWeather, eventsTelescope } = props

    const daysInMonth: number = calendarDate.daysInMonth()
    const firstDayOfMonth: number = parseInt(
        moment(calendarDate).startOf('month').format('d')
    )
    const isCurrentMonth = moment(calendarDate).isSame(new Date(), 'month')

    const getWeatherClass = (cond: number | undefined) => {
        if (typeof cond === 'undefined' || cond === null) return ''

        if (cond <= 35) return styles.green
        else if (cond >= 36 && cond <= 65) return styles.orange

        return styles.red
    }

    let blanks = []
    for (let i = 1; i < firstDayOfMonth; i++) {
        blanks.push(
            <td
                key={`empty${i}`}
                className={classNames(styles.calendarDay, styles.empty)}
            ></td>
        )
    }

    let daysMonth = []
    for (let d = 1; d <= daysInMonth; d++) {
        const currentDate = moment(calendarDate)
            .startOf('month')
            .add(d - 1, 'days')
        const currentDay: boolean =
            isCurrentMonth && d === parseInt(calendarDate.format('DD'))
        const moonTimes = SunCalc.getMoonTimes(currentDate, 51.7, 55.2)
        const sunTimes = SunCalc.getTimes(currentDate, 51.7, 55.2)

        const itemWeatherEvent = eventsWeather
            ?.filter((item) => currentDate.isSame(item.date, 'day'))
            ?.pop()

        const itemAstroEvents = eventsTelescope?.find(({ telescope_date }) =>
            currentDate.isSame(telescope_date, 'day')
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
                    role='button'
                    tabIndex={0}
                    onKeyUp={() => {}}
                    onClick={(e) => console.warn('onDayClick', e, d)}
                >
                    {d < 10 ? `0${d}` : d}
                </div>
                {!isMobile ? (
                    <div className={classNames(styles.event)}>
                        <MoonPhase date={currentDate} /> ↑{' '}
                        {moment(moonTimes.rise).format('H:mm')} ↓{' '}
                        {moment(moonTimes.set).format('H:mm')}
                    </div>
                ) : (
                    <div className={classNames(styles.moon)}>
                        <MoonPhase date={currentDate} />
                    </div>
                )}
                {!isMobile && (
                    <div className={classNames(styles.event, styles.sun)}>
                        <Image
                            src={SunIcon}
                            className={styles.icon}
                            alt=''
                            width={16}
                            height={16}
                        />{' '}
                        ↑ {moment(sunTimes.dawn).format('H:mm')} ↓{' '}
                        {moment(sunTimes.dusk).format('H:mm')}
                    </div>
                )}
                {itemWeatherEvent && (
                    <div className={classNames(styles.event, styles.weather)}>
                        {itemWeatherEvent.clouds !== null && (
                            <>
                                <Icon name='cloud' />
                                {itemWeatherEvent.clouds}{' '}
                            </>
                        )}
                        <Icon name='thermometer' />
                        {itemWeatherEvent.temperature} <Icon name='send' />
                        {itemWeatherEvent.wind_speed}
                    </div>
                )}
                {itemAstroEvents &&
                    (!isMobile ? (
                        <Popup
                            content={itemAstroEvents.catalog_items.join(', ')}
                            size='mini'
                            trigger={
                                <div
                                    className={classNames(
                                        styles.event,
                                        styles.telescope
                                    )}
                                >
                                    <Icon name='star outline' />
                                    {itemAstroEvents.catalog_items.length}{' '}
                                    <Icon name='clock outline' />
                                    {Math.round(
                                        itemAstroEvents.total_exposure / 60
                                    )}{' '}
                                    <Icon name='image outline' />
                                    {itemAstroEvents.frames_count}
                                </div>
                            }
                        />
                    ) : (
                        <div
                            className={classNames(
                                styles.event,
                                styles.telescope,
                                styles.mobile
                            )}
                        >
                            {Math.round(itemAstroEvents.total_exposure / 60)}
                        </div>
                    ))}
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
