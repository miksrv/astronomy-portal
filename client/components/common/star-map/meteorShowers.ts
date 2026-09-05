/**
 * Meteor shower radiants (FE-9 of features/star-atlas-upgrade.md): a small static
 * catalog of the major annual showers per the IMO working list — radiant coordinates
 * and month-day activity windows barely change year to year (Business Rule 11), so
 * it ships as a bundled JSON asset next to the other sky catalogs, fetched lazily
 * only when the layer is switched on.
 */

export type MeteorShower = {
    /** IMO three-letter code, e.g. 'PER' */
    id: string
    name: string
    nameRu: string
    /** Radiant J2000 position, degrees */
    ra: number
    dec: number
    /** Activity window as 'MM-DD' (may wrap over the new year, e.g. Quadrantids) */
    activeFrom: string
    activeTo: string
    /** Peak date as 'MM-DD' */
    peak: string
    /** Zenithal hourly rate at peak, for the info panel */
    zhr: number
}

const monthDayNumber = (monthDay: string): number => {
    const [month = 0, day = 0] = monthDay.split('-').map(Number)
    return month * 100 + day
}

const dateMonthDayNumber = (date: Date): number => (date.getUTCMonth() + 1) * 100 + date.getUTCDate()

/** Whether the shower is active on the given date (month-day window, year-wrap aware). */
export const isShowerActive = (shower: MeteorShower, date: Date): boolean => {
    const from = monthDayNumber(shower.activeFrom)
    const to = monthDayNumber(shower.activeTo)
    const current = dateMonthDayNumber(date)

    // A window like 12-28 → 01-12 wraps over the new year
    return from <= to ? current >= from && current <= to : current >= from || current <= to
}

/** Absolute distance in days from the date to the shower's nearest peak occurrence. */
export const daysToPeak = (shower: MeteorShower, date: Date): number => {
    const [month = 1, day = 1] = shower.peak.split('-').map(Number)
    const year = date.getUTCFullYear()

    const candidates = [year - 1, year, year + 1].map((y) => Date.UTC(y, month - 1, day))
    const distances = candidates.map((peak) => Math.abs(peak - date.getTime()) / 86_400_000)

    return Math.min(...distances)
}

/** Id of the active shower closest to its peak — the one worth framing right now. */
export const getNearestPeakShowerId = (showers: MeteorShower[], date: Date): string | null => {
    const active = showers.filter((shower) => isShowerActive(shower, date))

    if (!active.length) {
        return null
    }

    return active.reduce((best, shower) => (daysToPeak(shower, date) < daysToPeak(best, date) ? shower : best)).id
}

export const getShowerDisplayName = (shower: MeteorShower, language?: string): string =>
    language === 'ru' ? shower.nameRu : shower.name

/**
 * Draw the radiant markers for the showers active on the given date, highlighting the
 * one nearest its peak. Call from a Celestial redraw callback (canvas is already set up).
 */
export const drawMeteorRadiants = (options: { showers: MeteorShower[]; date: Date; language?: string }): void => {
    const { showers, date, language } = options
    const active = showers.filter((shower) => isShowerActive(shower, date))

    if (!active.length) {
        return
    }

    const nearestId = getNearestPeakShowerId(showers, date)
    const context = Celestial.context

    for (const shower of active) {
        const coordinates: [number, number] = [shower.ra > 180 ? shower.ra - 360 : shower.ra, shower.dec]

        if (!Celestial.clip(coordinates)) {
            continue
        }

        const point = Celestial.mapProjection(coordinates)

        if (!point) {
            continue
        }

        const isPeak = shower.id === nearestId
        const radius = isPeak ? 6 : 4
        const color = isPeak ? '#ff5533' : '#ffaa33'

        context.strokeStyle = color
        context.lineWidth = isPeak ? 1.6 : 1.1
        context.beginPath()
        context.arc(point[0], point[1], radius, 0, 2 * Math.PI)
        context.stroke()

        // Four short diverging rays — the classic "radiant" glyph
        for (const angle of [45, 135, 225, 315]) {
            const rad = (angle * Math.PI) / 180
            context.beginPath()
            context.moveTo(point[0] + Math.cos(rad) * (radius + 2), point[1] + Math.sin(rad) * (radius + 2))
            context.lineTo(point[0] + Math.cos(rad) * (radius + 7), point[1] + Math.sin(rad) * (radius + 7))
            context.stroke()
        }

        Celestial.setTextStyle({
            font: `${isPeak ? 'bold ' : ''}11px -apple-system, system-ui, sans-serif`,
            fill: color,
            align: 'left',
            baseline: 'bottom'
        })
        context.fillText(getShowerDisplayName(shower, language), point[0] + radius + 4, point[1] - radius - 2)
    }
}

let showersPromise: Promise<MeteorShower[]> | null = null

export const loadMeteorShowers = (): Promise<MeteorShower[]> => {
    showersPromise ??= fetch('/data/meteor-showers.json')
        .then((response) => response.json() as Promise<MeteorShower[]>)
        .catch((error) => {
            showersPromise = null
            console.error(error)
            return []
        })

    return showersPromise
}
