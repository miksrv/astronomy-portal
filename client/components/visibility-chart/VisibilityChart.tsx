import * as Astronomy from 'astronomy-engine'
import { ApiModel } from '@/api'
import { formatDate } from '@/tools/dates'
import { formatObjectName } from '@/tools/strings'
import { AstroTime, Observer } from 'astronomy-engine'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import ReactECharts from 'echarts-for-react'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useMemo, useState } from 'react'
import { Container } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

const LAT = parseFloat(process.env.NEXT_PUBLIC_LAT ?? '51.7')
const LON = parseFloat(process.env.NEXT_PUBLIC_LON ?? '55.2')

dayjs.extend(utc)
dayjs.extend(timezone)

interface VisibilityChartProps {
    object?: ApiModel.Object
    lat?: number
    lon?: number
}

type ChartDataType = any

type MarkAreaType = any

const VisibilityChart: React.FC<VisibilityChartProps> = ({
    object,
    lat = LAT,
    lon = LON
}) => {
    const { t } = useTranslation()

    const [chartData, setChartData] = useState<ChartDataType>([])
    const [markAreas, setMarkAreas] = useState<MarkAreaType>([])
    const [loading, setLoading] = useState<boolean>(true)

    const backgroundColor = '#2c2d2e' // --container-background-color
    const borderColor = '#444546' // --input-border-color
    const textSecondaryColor = '#76787a' // --text-color-secondary

    const date = dayjs().tz('Asia/Yekaterinburg').startOf('day')

    const objectName = object?.title || formatObjectName(object?.name)

    useEffect(() => {
        if (!object?.ra || !object?.dec) {
            return
        }

        const observer = new Astronomy.Observer(lat, lon, 0)

        const startOfDay = dayjs(date).add(-12, 'hour').toDate()
        const endOfDay = dayjs(date).add(12, 'hour').toDate()

        const startTime = Astronomy.MakeTime(startOfDay)
        const endTime = Astronomy.MakeTime(endOfDay)

        const interval = 5 * 60
        const intervalInDays = interval / 86400

        const sunEvents = makeSunEvents(observer, startTime)
        const twilightPhases = [
            {
                // День
                start: startOfDay,
                end: endOfDay,
                color: 'rgba(255, 255, 255, .1)'
            },
            {
                // Гражданские сумерки
                start: sunEvents.civilDusk?.date,
                end: sunEvents.civilDawn?.date,
                color: 'rgba(98, 98, 145, .4)'
            },
            {
                // Навигационные сумерки
                start: sunEvents.nauticalDusk?.date,
                end: sunEvents.nauticalDawn?.date,
                color: 'rgba(20, 20, 60, .3)'
            },
            {
                // Астрономическая ночь
                start: sunEvents.astroDusk?.date,
                end: sunEvents.astroDawn?.date,
                color: 'rgba(0, 0, 0, .3)'
            },
            {
                // Текущая область времени
                start: dayjs().subtract(interval, 'second').toDate(),
                end: dayjs().toDate(),
                color: 'rgba(255, 0, 0, .3)'
            }
        ].map((phase) => [
            {
                xAxis: dayjs(phase?.start).toISOString(),
                itemStyle: { color: phase.color }
            },
            {
                xAxis: dayjs(phase?.end).toISOString(),
                itemStyle: { color: phase.color }
            }
        ])

        setMarkAreas(twilightPhases)

        const data: ChartDataType[] = Array.from(
            { length: Math.ceil((endTime.ut - startTime.ut) / intervalInDays) },
            (_, i) => {
                const chartTime = Astronomy.MakeTime(
                    startTime.ut + i * intervalInDays
                )

                const hor = Astronomy.Horizon(
                    chartTime,
                    observer,
                    object?.ra || 0,
                    object?.dec || 0,
                    'normal'
                )

                return [chartTime.date.toISOString(), hor.altitude.toFixed(2)]
            }
        )

        setChartData(data)
        setLoading(false)
    }, [object?.ra, object?.dec])

    const options = useMemo(
        () => ({
            grid: {
                left: 10,
                right: 10,
                top: 10,
                bottom: 10,
                containLabel: true,
                borderColor: borderColor
            },
            loading,
            tooltip: {
                trigger: 'axis',
                backgroundColor,
                borderColor,
                formatter: (params: any) => {
                    const tooltipContent: string[] = []

                    if (params.length > 0) {
                        const header =
                            `<div class="${
                                styles.chartTooltipTitle
                            }">Local: ${formatDate(
                                params[0].axisValueLabel
                            )}</div>` +
                            `<div class="${
                                styles.chartTooltipTitle
                            }">UTC: ${formatDate(
                                dayjs(params[0].axisValueLabel).utc()
                            )}</div>` +
                            `<div class="${
                                styles.chartTooltipTitle
                            }">Observatory: ${formatDate(
                                dayjs(params[0].axisValueLabel)
                                    .utc()
                                    .tz('Asia/Yekaterinburg')
                            )}</div>`

                        tooltipContent.push(header)
                    }

                    params.forEach((item: any) => {
                        const colorSquare = `<span class="${styles.icon}" style="background-color: ${item.color};"></span>`
                        const seriesValue = `<span class="${styles.value}">${
                            item.value?.[1] ?? '---'
                        }</span>`
                        const seriesName = `<span class="${styles.label}">${item.seriesName}<span>${seriesValue}°</span></span>`

                        const row = `<div class="${styles.chartTooltipItem}">${colorSquare} ${seriesName}</div>`
                        tooltipContent.push(row)
                    })

                    return tooltipContent.join('')
                }
            },
            xAxis: {
                type: 'time',
                axisTick: {
                    show: true
                },
                axisLabel: {
                    show: true,
                    color: textSecondaryColor,
                    fontSize: '11px'
                },
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: borderColor
                    }
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        width: 1,
                        color: borderColor
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: `${t('height')} (°)`,
                min: 0,
                max: 90,
                interval: 10,
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: borderColor
                    }
                },
                axisLabel: {
                    show: true,
                    formatter: '{value}°',
                    color: textSecondaryColor,
                    fontSize: '11px'
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        width: 1,
                        color: borderColor
                    }
                }
            },
            series: [
                {
                    name: t('height'),
                    type: 'line',
                    data: chartData,
                    showSymbol: false,
                    smooth: false,
                    connectNulls: true,
                    markArea: {
                        silent: true,
                        data: markAreas
                    }
                }
            ]
        }),
        [chartData, markAreas]
    )

    return (
        <Container className={styles.container}>
            <h3 className={styles.title}>
                {t('visibility-chart.title', { name: objectName })}
            </h3>
            <div className={styles.description}>
                {t('visibility-chart.description', {
                    name: objectName,
                    date: formatDate(date, 'dddd, D MMMM YYYY'),
                    lat,
                    lon
                })}
            </div>
            <ReactECharts
                option={options}
                style={{ width: '100%', height: '200px' }}
            />
        </Container>
    )
}

/**
 * Calculates various sun events (rise, set, and twilight phases) for a given observer and time.
 *
 * @param {Observer} observer - The observer's location.
 * @param {AstroTime} time - The time at which to calculate the sun events.
 * @returns {Object} An object containing the times of various sun events.
 */
const makeSunEvents = (observer: Observer, time: AstroTime) => {
    const sun = Astronomy.Body.Sun

    return {
        rise: Astronomy.SearchRiseSet(sun, observer, 1, time, 1),
        set: Astronomy.SearchRiseSet(sun, observer, -1, time, 1),
        civilDawn: Astronomy.SearchAltitude(sun, observer, 1, time, 1, -6),
        nauticalDawn: Astronomy.SearchAltitude(sun, observer, 1, time, 1, -12),
        astroDawn: Astronomy.SearchAltitude(sun, observer, 1, time, 1, -18),
        astroDusk: Astronomy.SearchAltitude(sun, observer, -1, time, 1, -18),
        nauticalDusk: Astronomy.SearchAltitude(sun, observer, -1, time, 1, -12),
        civilDusk: Astronomy.SearchAltitude(sun, observer, -1, time, 1, -6)
    }
}

export default VisibilityChart
