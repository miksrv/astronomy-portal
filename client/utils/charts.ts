import { EChartsOption } from 'echarts'

// Color tokens matching CSS variables of the project
export const CHART_COLORS = {
    background: '#2c2d2e', // --container-background-color
    border: '#444546', // --input-border-color
    textPrimary: '#e1e3e6', // --text-color-primary
    textSecondary: '#76787a' // --text-color-secondary
} as const

/**
 * Base ECharts configuration applied to all charts in the project.
 * Pass an optional tooltipFormatter to override the tooltip formatter.
 * If not passed, the tooltip will not have a custom formatter.
 */
export function getBaseChartConfig(tooltipFormatter?: EChartsOption['tooltip']): EChartsOption {
    return {
        backgroundColor: CHART_COLORS.background,
        grid: {
            left: 10,
            right: 10,
            top: 15,
            bottom: 25,
            containLabel: true,
            borderColor: CHART_COLORS.border
        },
        legend: {
            type: 'plain',
            orient: 'horizontal',
            left: 5,
            bottom: 0,
            itemWidth: 20,
            itemHeight: 2,
            textStyle: {
                color: CHART_COLORS.textPrimary,
                fontSize: '12px'
            },
            icon: 'rect'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            },
            backgroundColor: CHART_COLORS.background,
            borderColor: CHART_COLORS.border,
            ...(tooltipFormatter ?? {})
        },
        xAxis: {
            type: 'time',
            axisLabel: {
                show: true,
                hideOverlap: true,
                color: CHART_COLORS.textSecondary,
                fontSize: '11px'
            },
            axisTick: {
                show: true
            },
            axisLine: {
                show: true,
                lineStyle: {
                    color: CHART_COLORS.border
                }
            },
            splitLine: {
                show: true,
                lineStyle: {
                    width: 1,
                    color: CHART_COLORS.border
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
                    color: CHART_COLORS.border
                }
            },
            axisLabel: {
                show: true,
                color: CHART_COLORS.textSecondary,
                fontSize: '11px'
            },
            splitLine: {
                show: true,
                lineStyle: {
                    width: 1,
                    color: CHART_COLORS.border
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
}
