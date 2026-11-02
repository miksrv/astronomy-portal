import { ApiModel } from '@/api'
import { getNight } from '@/utils/visibility'

/** Tonight, local time: from 18:00 to 07:00 (hours after the night's noon start) */
const EVENING_HOUR = 6
const MORNING_HOUR = 19

/** "YYYY-MM-DD HH:mm:ss" in UTC → Date */
export const parseMeteoDate = (date?: string): Date | undefined =>
    date ? new Date(`${date.replace(' ', 'T')}Z`) : undefined

/** After 03:00 local the current night is nearly over: the next one is the one to plan */
const LATE_NIGHT_HOUR = 15

/** The hourly forecast entries of the coming night, evening to morning */
export const getTonightHours = (hourly: ApiModel.Weather[] | undefined, now: Date): ApiModel.Weather[] => {
    const nightStart = getNight(now).start.getTime()
    const start = now.getTime() - nightStart >= LATE_NIGHT_HOUR * 3_600_000 ? nightStart + 24 * 3_600_000 : nightStart
    const from = start + EVENING_HOUR * 3_600_000
    const to = start + MORNING_HOUR * 3_600_000

    return (hourly ?? []).filter(({ date }) => {
        const time = parseMeteoDate(date)?.getTime() ?? 0

        return time >= from && time <= to
    })
}
