import * as SunCalc from 'suncalc'

import { ApiModel } from '@/api'

/**
 * The observing log of an object: its FITS frames grouped into nights. The UI reads only these
 * shapes, so the source of the frames (today `GET /files/:object`) can change without it.
 */
export interface ObservingFrame {
    /** UTC, ISO 8601 */
    time: string
    filter: ApiModel.FilterTypes
    /** Seconds */
    exposure: number
    gain?: number
    offset?: number
    ccdTemp?: number
    fileName?: string
}

export interface ObservingNight {
    /** The evening the night started on, `YYYY-MM-DD` */
    date: string
    /** Oldest first */
    frames: ObservingFrame[]
    /** Seconds */
    exposure: number
    /** Frames per filter */
    filters: Partial<Record<ApiModel.FilterTypes, number>>
    /** Mean sensor temperature, °C */
    ccdTemp?: number
    /** Illuminated fraction of the Moon that night, 0..1 */
    moon: number
}

/** A night runs from local noon (07:00 UTC at UTC+5) to the next local noon */
const NIGHT_OFFSET_MS = 7 * 3_600_000

/** The observing night a moment belongs to, `YYYY-MM-DD` */
export const getNightDate = (time: string | Date): string =>
    new Date(new Date(time).getTime() - NIGHT_OFFSET_MS).toISOString().slice(0, 10)

/** `GET /files/:object` items → frames */
export const toObservingFrames = (files?: ApiModel.File[]): ObservingFrame[] =>
    (files ?? [])
        .filter((file) => !!file.date?.date)
        .map((file) => ({
            // "2020-07-09 20:26:15.000000" in UTC
            time: `${file.date!.date.slice(0, 19).replace(' ', 'T')}Z`,
            filter: file.filter,
            exposure: file.exposure ?? 0,
            gain: file.gain,
            offset: file.offset,
            ccdTemp: file.ccdTemp,
            fileName: file.fileName
        }))

/** Groups frames into nights, the latest night first */
export const groupFramesIntoNights = (frames: ObservingFrame[]): ObservingNight[] => {
    const byNight = new Map<string, ObservingFrame[]>()

    frames.forEach((frame) => {
        const date = getNightDate(frame.time)
        byNight.set(date, [...(byNight.get(date) ?? []), frame])
    })

    return [...byNight.entries()]
        .map(([date, nightFrames]) => {
            const sorted = [...nightFrames].sort((a, b) => a.time.localeCompare(b.time))
            const temperatures = sorted.map(({ ccdTemp }) => ccdTemp).filter((t): t is number => typeof t === 'number')

            return {
                date,
                frames: sorted,
                exposure: sorted.reduce((sum, { exposure }) => sum + exposure, 0),
                filters: sorted.reduce<ObservingNight['filters']>(
                    (counts, { filter }) => ({ ...counts, [filter]: (counts[filter] ?? 0) + 1 }),
                    {}
                ),
                ccdTemp: temperatures.length
                    ? Math.round(temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length)
                    : undefined,
                // Around local midnight of that night
                moon: SunCalc.getMoonIllumination(new Date(`${date}T19:00:00Z`)).fraction
            }
        })
        .sort((a, b) => b.date.localeCompare(a.date))
}
