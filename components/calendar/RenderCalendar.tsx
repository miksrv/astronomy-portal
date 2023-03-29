import moment, { Moment } from 'moment'
import React from 'react'
import { Icon, Popup } from 'semantic-ui-react'
import SunCalc from 'suncalc'
import Image from "next/image";

import { TFilesMonth, TWeatherMonth } from '@/api/types'

import MoonPhase from '@/components/moon-phase/MoonPhase'

import SunIcon from '../moon-phase/images/sun.png'

import styles from './calendar.module.sass'
import classNames from "classnames";

type TRenderCalendarProps = {
    dateObject: Moment
    eventsWeather: TWeatherMonth[]
    eventsTelescope: TFilesMonth[]
}

const RenderCalendar: React.FC<TRenderCalendarProps> = (props) => {
    const { dateObject, eventsWeather, eventsTelescope } = props

    const currentMobile: boolean = typeof window !== "undefined" ? window.innerWidth <= 760 : false
    const daysInMonth: number = dateObject.daysInMonth()
    const firstDayOfMonth: number = parseInt(
        moment(dateObject).startOf('month').format('d')
    )
    const isCurrentMonth = moment(dateObject).isSame(new Date(), 'month')

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
        const currentDate = moment(dateObject)
            .startOf('month')
            .add(d - 1, 'days')
        const currentDay =
            isCurrentMonth && d === parseInt(dateObject.format('DD'))
                ? 'today'
                : ''
        const moonTimes = SunCalc.getMoonTimes(currentDate, 51.7, 55.2)
        const sunTimes = SunCalc.getTimes(currentDate, 51.7, 55.2)

        const itemWeatherEvent = eventsWeather
            .filter((item) => currentDate.isSame(item.date, 'day'))
            .pop()
        const itemAstroEvents = eventsTelescope
            .filter((item: any) => currentDate.isSame(item.date, 'day'))
            .pop()

        daysMonth.push(
            <td
                key={`day${d}`}
                className={classNames(styles.calendarDay, currentDay)}
            >
                <div
                    className={classNames(styles.day, getWeatherClass(itemWeatherEvent?.clouds))}
                    role='button'
                    tabIndex={0}
                    onKeyUp={() => {}}
                    onClick={(e) => console.warn('onDayClick', e, d)}
                >
                    {d < 10 ? `0${d}` : d}
                </div>
                {!currentMobile ? (
                    <div className={classNames(styles.event, styles.moon)}>
                        <MoonPhase date={currentDate} /> ↑{' '}
                        {moment(moonTimes.rise).format('H:mm')} ↓{' '}
                        {moment(moonTimes.set).format('H:mm')}
                    </div>
                ) : (
                    <div className={classNames(styles.event, styles.moon, styles.mobile)}>
                        <MoonPhase date={currentDate} />
                    </div>
                )}
                {!currentMobile && (
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
                {itemWeatherEvent && !currentMobile && (
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
                    (!currentMobile ? (
                        <Popup
                            content={itemAstroEvents.objects.join(', ')}
                            size='mini'
                            trigger={
                                <div className={classNames(styles.event, styles.telescope)}>
                                    <Icon name='star outline' />
                                    {itemAstroEvents.objects.length}{' '}
                                    <Icon name='clock outline' />
                                    {Math.round(
                                        itemAstroEvents.exposure / 60
                                    )}{' '}
                                    <Icon name='image outline' />
                                    {itemAstroEvents.frames}
                                </div>
                            }
                        />
                    ) : (
                        <div className={classNames(styles.event, styles.telescope, styles.mobile)}>
                            {Math.round(itemAstroEvents.exposure / 60)}
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

        // Добавляем пустые строки в конце месяца
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
