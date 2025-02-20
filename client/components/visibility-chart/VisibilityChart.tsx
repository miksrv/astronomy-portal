import * as Astronomy from 'astronomy-engine'
import { ApiModel } from '@/api'
import { formatDate } from '@/tools/dates'
import { formatObjectName } from '@/tools/strings'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import ReactECharts from 'echarts-for-react'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useState } from 'react'
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
    const date = new Date()

    const backgroundColor = '#2c2d2e' // --container-background-color
    const borderColor = '#444546' // --input-border-color
    const textSecondaryColor = '#76787a' // --text-color-secondary

    useEffect(() => {
        if (!object?.ra || !object?.dec) {
            return
        }

        const observer = new Astronomy.Observer(lat, lon, 0)

        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date(startOfDay)
        endOfDay.setDate(endOfDay.getDate() + 1)

        const startTime = Astronomy.MakeTime(startOfDay)
        const endTime = Astronomy.MakeTime(endOfDay)

        const data: ChartDataType[] = []
        const interval = 15 * 60
        const intervalInDays = interval / 86400

        const sunEvents = {
            rise: Astronomy.SearchRiseSet(
                Astronomy.Body.Sun,
                observer,
                1, // Восход
                Astronomy.MakeTime(startOfDay),
                1
            ),
            set: Astronomy.SearchRiseSet(
                Astronomy.Body.Sun,
                observer,
                -1, // Закат
                Astronomy.MakeTime(startOfDay),
                1
            ),
            civilDawn: Astronomy.SearchAltitude(
                Astronomy.Body.Sun,
                observer,
                1, // Восход
                Astronomy.MakeTime(startOfDay),
                1,
                -6 // Высота
            ),
            nauticalDawn: Astronomy.SearchAltitude(
                Astronomy.Body.Sun,
                observer,
                1,
                Astronomy.MakeTime(startOfDay),
                1,
                -12
            ),
            astroDawn: Astronomy.SearchAltitude(
                Astronomy.Body.Sun,
                observer,
                1,
                Astronomy.MakeTime(startOfDay),
                1,
                -18
            ),
            astroDusk: Astronomy.SearchAltitude(
                Astronomy.Body.Sun,
                observer,
                -1, // Закат
                Astronomy.MakeTime(startOfDay),
                1,
                -18
            ),
            nauticalDusk: Astronomy.SearchAltitude(
                Astronomy.Body.Sun,
                observer,
                -1,
                Astronomy.MakeTime(startOfDay),
                1,
                -12
            ),
            civilDusk: Astronomy.SearchAltitude(
                Astronomy.Body.Sun,
                observer,
                -1,
                Astronomy.MakeTime(startOfDay),
                1,
                -6
            )
        }

        const twilightPhases = [
            {
                name: 'Астрономическая ночь',
                start: sunEvents.astroDusk,
                end: sunEvents.astroDawn,
                color: 'rgba(0, 0, 0, 0.6)'
            },
            {
                name: 'Навигационные сумерки',
                start: sunEvents.nauticalDusk,
                end: sunEvents.nauticalDawn,
                color: 'rgba(20, 20, 60, 0.5)'
            },
            {
                name: 'Гражданские сумерки',
                start: sunEvents.civilDusk,
                end: sunEvents.civilDawn,
                color: 'rgba(50, 50, 100, 0.4)'
            },
            {
                name: 'День',
                start: sunEvents.rise,
                end: sunEvents.set,
                color: 'rgba(255, 255, 255, 0.2)'
            }
        ].map((phase) => [
            {
                xAxis: dayjs(phase?.start?.date)
                    .tz('Asia/Yekaterinburg')
                    .toISOString(),
                itemStyle: { color: phase.color }
            },
            {
                xAxis: dayjs(phase?.end?.date)
                    .tz('Asia/Yekaterinburg')
                    .toISOString(),
                itemStyle: { color: phase.color }
            }
        ])

        setMarkAreas(twilightPhases)

        for (
            let time = startTime;
            time.ut < endTime.ut;
            time = Astronomy.MakeTime(time.ut + intervalInDays)
        ) {
            const hor = Astronomy.Horizon(
                time,
                observer,
                object?.ra,
                object?.dec,
                'normal'
            )

            data.push([
                dayjs(time.date).tz('Asia/Yekaterinburg').toISOString(),
                hor.altitude.toFixed(2)
            ])
        }

        setChartData(data)
        setLoading(false)
    }, [object?.ra, object?.dec])

    const options = {
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
                    const header = `<div class="${
                        styles.chartTooltipTitle
                    }">${formatDate(params[0].axisValueLabel)}</div>`
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

                // Return the merged contents of the tooltip
                return tooltipContent.join('')
            }
        },
        xAxis: {
            type: 'time',
            axisTick: {
                show: true
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
            name: 'Высота (°)',
            min: 0,
            max: 90,
            interval: 10,
            axisLine: {
                show: true,
                lineStyle: {
                    color: borderColor // Y axis color
                }
            },
            axisLabel: {
                show: true,
                formatter: '{value}°',
                color: textSecondaryColor, // Color of Y axis labels
                fontSize: '11px'
            },
            splitLine: {
                show: true,
                lineStyle: {
                    width: 1,
                    color: borderColor // Grid line color
                }
            }
        },
        series: [
            {
                name: 'Высота',
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
    }

    const objectName = object?.title || formatObjectName(object?.name)

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

export default VisibilityChart
