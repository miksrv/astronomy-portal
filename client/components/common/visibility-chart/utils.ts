import * as SunCalc from 'suncalc'

import { DARK_SUN_ALTITUDE, getAltitude, Night, OBSERVATORY_LAT, OBSERVATORY_LON } from '@/utils/visibility'

export const CHART_WIDTH = 560
export const CHART_HEIGHT = 220
export const PADDING = { left: 38, right: 8, top: 14, bottom: 26 }

const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right
const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom

/** x of a fraction of the night (0..1) */
export const toX = (position: number): number => PADDING.left + position * plotWidth

/** y of an altitude; everything under the horizon sits on it */
export const toY = (altitude: number): number => PADDING.top + (1 - Math.max(0, altitude) / 90) * plotHeight

export const BASELINE = toY(0)

/** SVG points of a body's altitude over the night */
const toPoints = (night: Night, getBodyAltitude: (time: Date) => number): string => {
    const last = night.samples.length - 1

    return night.samples.map(({ time }, i) => `${toX(i / last)},${toY(getBodyAltitude(time))}`).join(' ')
}

export const getObjectPoints = (night: Night, ra: number, dec: number): string =>
    toPoints(night, (time) => getAltitude(ra, dec, time))

export const getMoonPoints = (night: Night): string =>
    toPoints(night, (time) => SunCalc.getMoonPosition(time, OBSERVATORY_LAT, OBSERVATORY_LON).altitude)

/** The dark spans of the night (the Sun below −12°) as [from, to] fractions of it */
export const getDarkSpans = (night: Night): Array<[number, number]> => {
    const last = night.samples.length - 1
    const spans: Array<[number, number]> = []
    let start: number | undefined

    night.samples.forEach(({ sun }, i) => {
        const dark = sun <= DARK_SUN_ALTITUDE

        if (dark && start === undefined) {
            start = i
        }

        if ((!dark || i === last) && start !== undefined) {
            spans.push([start / last, i / last])
            start = undefined
        }
    })

    return spans
}
