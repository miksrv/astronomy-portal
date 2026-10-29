import { EChartsOption } from 'echarts'

// ECharts takes colours in JS, so the night palette of styles/theme.css is mirrored here
// (DESIGN.md section 7). Keep in sync with the tokens named in the comments.
export const CHART_COLORS = {
    background: '#1c1f2a', // --surface-1
    border: '#2a2e42', // --border
    borderStrong: '#3a3f58', // --border-strong
    brand: '#8d8cf0', // --color-main
    textPrimary: '#e8e9f0', // --text-color-primary
    textSecondary: '#a3a7b6', // --text-color-secondary
    tooltipBackground: '#242838' // --surface-2
} as const

// The kit's --font-family (a canvas cannot read CSS variables)
export const CHART_FONT_FAMILY =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", system-ui, sans-serif'

const AXIS_FONT_SIZE = 12 // --font-size-small

/** Tooltip box shared by every chart: surface-2 plate, hairline border, --radius-lg, --shadow-md. */
export const CHART_TOOLTIP_STYLE = {
    backgroundColor: CHART_COLORS.tooltipBackground,
    borderColor: CHART_COLORS.borderStrong,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: CHART_COLORS.textPrimary, fontFamily: CHART_FONT_FAMILY, fontSize: 12 },
    extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);'
}

/** Crosshair of an axis tooltip: hairlines and a value label on a surface-2 plate. */
export const CHART_AXIS_POINTER_STYLE = {
    lineStyle: { color: CHART_COLORS.borderStrong },
    crossStyle: { color: CHART_COLORS.borderStrong },
    label: { backgroundColor: CHART_COLORS.tooltipBackground, color: CHART_COLORS.textPrimary }
}

/**
 * Base ECharts configuration applied to all charts in the project.
 * Pass an optional tooltipFormatter to override the tooltip formatter.
 * If not passed, the tooltip will not have a custom formatter.
 */
export function getBaseChartConfig(tooltipFormatter?: EChartsOption['tooltip']): EChartsOption {
    return {
        // Charts sit on a card (Container) or the page: let the surface show through
        backgroundColor: 'transparent',
        // Generated text description of the chart for screen readers
        aria: { enabled: true },
        textStyle: { fontFamily: CHART_FONT_FAMILY },
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
                color: CHART_COLORS.textSecondary,
                fontSize: AXIS_FONT_SIZE
            },
            icon: 'rect'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                ...CHART_AXIS_POINTER_STYLE
            },
            ...CHART_TOOLTIP_STYLE,
            ...(tooltipFormatter ?? {})
        },
        xAxis: {
            type: 'time',
            axisLabel: {
                show: true,
                hideOverlap: true,
                color: CHART_COLORS.textSecondary,
                fontSize: AXIS_FONT_SIZE
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
                fontSize: AXIS_FONT_SIZE
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

/**
 * Weather series colours: [line, translucent area]. The generic sensor palette
 * (utils/colors.ts) has a navy for clouds that disappears on the night surface.
 */
export const WEATHER_SERIES_COLORS: Record<string, [string, string]> = {
    clouds: [CHART_COLORS.brand, 'rgba(141, 140, 240, 0.22)'],
    // Apart from the red temperature line
    feelsLike: ['#e8a04a', '#e8a04a'] // --color-orange
}
