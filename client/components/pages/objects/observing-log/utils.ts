import { ObservingNight } from '@/utils/observingLog'

export const ACCUM_WIDTH = 1000
export const ACCUM_HEIGHT = 110
const PADDING = { left: 8, right: 8, top: 8, bottom: 20 }

const DAY_MS = 86_400_000

export interface AccumulatedChart {
    /** The step line of the running total */
    points: string
    /** The step line closed down to the baseline */
    area: string
    dots: Array<{ x: number; y: number; date: string; exposure: number }>
    years: Array<{ x: number; year: number; line: boolean }>
}

/** The running total of exposure night after night, as a step chart */
export const getAccumulatedChart = (nights: ObservingNight[]): AccumulatedChart | undefined => {
    if (!nights.length) {
        return undefined
    }

    const ascending = [...nights].sort((a, b) => a.date.localeCompare(b.date))
    const time = (date: string) => new Date(`${date}T12:00:00Z`).getTime()
    const first = time(ascending[0]!.date)
    const last = time(ascending[ascending.length - 1]!.date)
    const total = ascending.reduce((sum, { exposure }) => sum + exposure, 0) || 1

    const x = (date: string) =>
        PADDING.left + ((time(date) - first) / (last - first || DAY_MS)) * (ACCUM_WIDTH - PADDING.left - PADDING.right)
    const y = (value: number) => PADDING.top + (1 - value / total) * (ACCUM_HEIGHT - PADDING.top - PADDING.bottom)
    const baseline = y(0)

    let accumulated = 0
    let points = `${x(ascending[0]!.date)},${baseline}`

    const dots = ascending.map(({ date, exposure }) => {
        const previous = y(accumulated)
        accumulated += exposure
        points += ` ${x(date)},${previous} ${x(date)},${y(accumulated)}`

        return { x: x(date), y: y(accumulated), date, exposure }
    })

    const firstYear = Number(ascending[0]!.date.slice(0, 4))
    const lastYear = Number(ascending[ascending.length - 1]!.date.slice(0, 4))
    const years = []

    for (let year = firstYear; year <= lastYear; year++) {
        const start = `${year}-01-01`
        years.push(time(start) > first ? { x: x(start), year, line: true } : { x: PADDING.left, year, line: false })
    }

    return {
        points,
        area: `${points} ${x(ascending[ascending.length - 1]!.date)},${baseline}`,
        dots,
        years
    }
}

export const ACCUM_PLOT = { top: PADDING.top, bottom: ACCUM_HEIGHT - PADDING.bottom }
