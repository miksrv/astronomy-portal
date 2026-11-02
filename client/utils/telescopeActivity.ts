import { ApiModel } from '@/api'

/**
 * The telescope's work, night by night. The observatory page reads only these shapes, so their
 * source (today `GET /statistic/telescope`) can change without touching the UI.
 */
export interface TelescopeNight {
    /** The evening the night started on, `YYYY-MM-DD` */
    date: string
    /** Seconds */
    exposure: number
    frames: number
    /** Catalog names of the objects shot */
    objects: string[]
}

export type ActivityLevel = 0 | 1 | 2 | 3 | 4

export interface ActivityDay {
    date: string
    /** False for the padding days of the first and last weeks */
    inYear: boolean
    night?: TelescopeNight
}

export interface ActivityWeek {
    /** 0-based month starting in this week, for the label over it */
    month?: number
    /** Monday to Sunday */
    days: ActivityDay[]
}

/** `GET /statistic/telescope` items → nights, the latest first */
export const toTelescopeNights = (items?: ApiModel.Telescope[]): TelescopeNight[] =>
    (items ?? [])
        .map((item) => ({
            date: item.telescope_date,
            exposure: Number(item.total_exposure) || 0,
            frames: Number(item.frames_count) || 0,
            objects: item.catalog_items ?? []
        }))
        .sort((a, b) => b.date.localeCompare(a.date))

/** Hours of exposure in a night → the heat map's shade */
export const getActivityLevel = (exposure?: number): ActivityLevel => {
    if (!exposure) {
        return 0
    }

    const hours = exposure / 3600

    return hours < 1 ? 1 : hours < 3 ? 2 : hours < 5 ? 3 : 4
}

/** The years with at least one night, oldest first */
export const getActivityYears = (nights: TelescopeNight[]): number[] =>
    [...new Set(nights.map(({ date }) => Number(date.slice(0, 4))))].sort((a, b) => a - b)

/** A year as columns of weeks (Monday first), each night in its day */
export const getActivityWeeks = (year: number, nights: TelescopeNight[]): ActivityWeek[] => {
    const byDate = new Map(nights.map((night) => [night.date, night]))
    const first = Date.UTC(year, 0, 1)
    const offset = (new Date(first).getUTCDay() + 6) % 7
    const days = (Date.UTC(year + 1, 0, 1) - first) / 86_400_000
    const weeks: ActivityWeek[] = []

    for (let week = 0; week < Math.ceil((days + offset) / 7); week++) {
        const monday = new Date(first + (week * 7 - offset) * 86_400_000)
        const startsMonth = monday.getUTCFullYear() === year && monday.getUTCDate() <= 7

        weeks.push({
            month: week === 0 ? 0 : startsMonth && monday.getUTCMonth() > 0 ? monday.getUTCMonth() : undefined,
            days: Array.from({ length: 7 }, (_, day) => {
                const date = new Date(monday.getTime() + day * 86_400_000)
                const iso = date.toISOString().slice(0, 10)

                return { date: iso, inYear: date.getUTCFullYear() === year, night: byDate.get(iso) }
            })
        })
    }

    return weeks
}

/** Totals of the nights of one year */
export const getYearTotals = (nights: TelescopeNight[], year: number) => {
    const ofYear = nights.filter(({ date }) => date.startsWith(String(year)))

    return {
        nights: ofYear.length,
        exposure: ofYear.reduce((sum, { exposure }) => sum + exposure, 0),
        frames: ofYear.reduce((sum, { frames }) => sum + frames, 0),
        objects: new Set(ofYear.flatMap(({ objects }) => objects)).size
    }
}
