import React, { useMemo } from 'react'
import { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'

import { useTranslation } from 'next-i18next'

import { ApiModel } from '@/api'
import { getSensorColor } from '@/utils/colors'
import { formatDateFromUnixUTC } from '@/utils/dates'
import { round } from '@/utils/helpers'

import { ChartTypes } from './types'

import styles from './styles.module.sass'

interface ChartProps {
    type: ChartTypes
    data?: ApiModel.Weather[]
    height?: string | number
    dateFormat?: string
}

// TODO: formatter: function (params: any) - replace any with correct type
export const Chart: React.FC<ChartProps> = ({ type, data, height, dateFormat }) => {
    const { t } = useTranslation()

    const backgroundColor = '#2c2d2e' // --container-background-color
    const borderColor = '#444546' // --input-border-color
    const textPrimaryColor = '#e1e3e6' // --text-color-primary
    const textSecondaryColor = '#76787a' // --text-color-secondary

    const baseConfig: EChartsOption = {
        backgroundColor,
        grid: {
            left: 10,
            right: 10,
            top: 15,
            bottom: 25,
            containLabel: true,
            borderColor: borderColor
        },
        legend: {
            type: 'plain',
            orient: 'horizontal', // Горизонтальное расположение легенды
            left: 5, // Выравнивание по левому краю
            bottom: 0, // Размещение легенды под графиком
            itemWidth: 20, // Ширина значка линии в легенде
            itemHeight: 2, // Высота значка линии в легенде (делает линию тоньше)
            textStyle: {
                // fontFamily: '-apple-system, system-ui, \'Helvetica Neue\', Roboto, sans-serif',
                color: textPrimaryColor, // Цвет текста легенды
                fontSize: '12px'
            },
            icon: 'rect' // Используем короткую линию в качестве значка
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                label: {
                    formatter: function (params) {
                        if (params?.axisDimension === 'x') {
                            return formatDateFromUnixUTC(
                                params?.value as number,
                                t(
                                    'components.pages.observatory.widget-chart.chart-label_date-format',
                                    'D MMM YYYY, HH:mm'
                                )
                            )
                        }

                        return round(Number(params?.value), 2)?.toString() ?? ''
                    }
                }
            },
            backgroundColor,
            borderColor,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (params: any) => {
                // An array of strings that will be concatenated and returned as the contents of the tooltip
                const tooltipContent: string[] = []

                //Format the header - let's assume it's a date (xAxis)
                if (params.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    const header = `<div class="${styles.chartTooltipTitle}">${params[0].axisValueLabel}</div>`
                    tooltipContent.push(header)
                }

                // Loop through each element in params to display the values (yAxis)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                params.forEach((item: any) => {
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    const colorSquare = `<span class="${styles.icon}" style="background-color: ${item.color};"></span>`
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    const seriesValue = `<span class="${styles.value}">${item.value?.[1] ?? '---'}</span>`
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    const seriesName = `<span class="${styles.label}">${item.seriesName}${seriesValue}</span>`

                    const row = `<div class="${styles.chartTooltipItem}">${colorSquare} ${seriesName}</div>`
                    tooltipContent.push(row)
                })

                // Return the merged contents of the tooltip
                return tooltipContent.join('')
            }
        },
        xAxis: {
            type: 'time',
            axisLabel: {
                show: true,
                hideOverlap: true,
                color: textSecondaryColor, // Color of X-axis labels
                fontSize: '11px',
                formatter: (value: number) =>
                    formatDateFromUnixUTC(
                        value,
                        dateFormat ?? t('components.pages.observatory.widget-chart.only-hour_date-format', 'HH:mm')
                    )
            },
            axisTick: {
                show: true
            },
            axisLine: {
                show: true,
                lineStyle: {
                    color: borderColor // X axis color
                }
            },
            splitLine: {
                show: true,
                lineStyle: {
                    width: 1,
                    color: borderColor // Grid line color
                }
            }
        },
        yAxis: {
            type: 'value',
            nameGap: 50,
            axisTick: {
                show: true
            },
            axisLine: {
                show: true,
                lineStyle: {
                    color: borderColor // Y axis color
                }
            },
            axisLabel: {
                show: true,
                formatter: '{value}%',
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
                type: 'line',
                showSymbol: false,
                smooth: false,
                connectNulls: true
            }
        ]
    }

    const getChartLineConfig = (source: keyof ApiModel.Weather, name?: string, axis?: number, area?: boolean) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(baseConfig.series as any)[0],
        data: data?.map(({ date, [source]: sensorData }) => [date, sensorData]),
        name: name ?? '',
        yAxisIndex: axis ?? 0,
        lineStyle: {
            color: getSensorColor(source)[0],
            width: 1
        },
        itemStyle: {
            color: getSensorColor(source)[0]
        },
        areaStyle: area
            ? {
                  color: getSensorColor(source)[1]
              }
            : undefined
    })

    const config: EChartsOption = useMemo(() => {
        switch (type) {
            default:
            case 'temperature':
                return {
                    ...baseConfig,
                    yAxis: [
                        {
                            ...baseConfig.yAxis,
                            axisLabel: {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                ...(baseConfig.yAxis as any).axisLabel,
                                formatter: '{value}°C'
                            }
                        }
                    ],
                    series: [
                        getChartLineConfig(
                            'temperature',
                            t('components.pages.observatory.widget-chart.temperature', 'Температура')
                        ),
                        getChartLineConfig(
                            'feelsLike',
                            t('components.pages.observatory.widget-chart.feels-like', 'Ощущается как')
                        ),
                        getChartLineConfig(
                            'dewPoint',
                            t('components.pages.observatory.widget-chart.dew-point', 'Точка росы')
                        )
                    ]
                }

            case 'clouds':
                return {
                    ...baseConfig,
                    yAxis: [
                        {
                            ...baseConfig.yAxis,
                            axisLabel: {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                ...(baseConfig.yAxis as any).axisLabel,
                                formatter: '{value}%'
                            }
                        },
                        {
                            ...baseConfig.yAxis,
                            axisLabel: {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                ...(baseConfig.yAxis as any).axisLabel,
                                formatter: `{value}${t('components.pages.observatory.widget-chart.meters-per-second', 'м/с')}`
                            }
                        }
                    ],
                    series: [
                        getChartLineConfig(
                            'clouds',
                            t('components.pages.observatory.widget-chart.clouds', 'Облачность'),
                            0,
                            true
                        ),
                        getChartLineConfig(
                            'windSpeed',
                            t('components.pages.observatory.widget-chart.wind-speed', 'Скорость ветра'),
                            1
                        )
                    ]
                }
        }
    }, [type, data])

    return (
        <ReactECharts
            option={config}
            style={{ height: height ?? '260px', width: '100%' }}
        />
    )
}
