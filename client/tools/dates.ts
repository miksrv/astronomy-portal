import dayjs, { Dayjs } from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import {declOfNum} from '@/tools/helpers'

dayjs.extend(utc)
dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.extend(timezone)

type TimeUnitsLocale = {
    day: [string, string, string]
    hour: [string, string, string]
    minute: [string, string, string]
    second: [string, string, string]
}

export const TIME_ZONE = 'Asia/Yekaterinburg'
export const DEFAULT_SHORT_DATE_FORMAT = 'DD.MM.YYYY, HH:mm'
export const DEFAULT_FULL_DATE_FORMAT = 'D MMMM YYYY, HH:mm'

export const formatDate = (date?: string | Date | Dayjs, format?: string): string | undefined =>
    date ? dayjs(date).format(format ?? DEFAULT_SHORT_DATE_FORMAT) : undefined

export const formatUTCDate = (date?: string | Date, format: string = DEFAULT_FULL_DATE_FORMAT): string | undefined =>
    date ? dayjs.utc(date).tz(TIME_ZONE).format(format) : undefined

export const formatDateFromUnixUTC = (timestamp?: number, format: string = DEFAULT_FULL_DATE_FORMAT): string =>
    timestamp
        ? dayjs
              .unix(timestamp / 1000)
              .utc(true)
              .tz(TIME_ZONE)
              .format(format)
        : ''

export const getSecondsUntilUTCDate = (date?: string | Date): number | undefined =>
    date ? dayjs.utc(date).tz(TIME_ZONE).diff(dayjs(), 'second') : undefined

export const getLocalizedTimeFromSec = (
    sec: number,
    full: boolean = false,
    t: (key: string) => string
): string => {
    if (sec <= 0) {
        return '0'
    }

    const locale: TimeUnitsLocale = {
        day: [t('time.day_1'), t('time.day_2'), t('time.day_5')],
        hour: [t('time.hour_1'), t('time.hour_2'), t('time.hour_5')],
        minute: [t('time.minute_1'), t('time.minute_2'), t('time.minute_5')],
        second: [t('time.second_1'), t('time.second_2'), t('time.second_5')]
    }

    const d = dayjs.duration(sec * 1000)

    if (full) {
        const parts: string[] = []

        const days = d.days()
        const hours = d.hours()
        const minutes = d.minutes()
        const seconds = d.seconds()

        if (days) {parts.push(`${days} ${declOfNum(days, locale.day)}`)}
        if (hours) {parts.push(`${hours} ${declOfNum(hours, locale.hour)}`)}
        if (minutes) {parts.push(`${minutes} ${declOfNum(minutes, locale.minute)}`)}
        if (seconds && parts.length === 0) {parts.push(`${seconds} ${declOfNum(seconds, locale.second)}`)}

        return parts.join(' ')
    }
        const h = String(d.hours()).padStart(2, '0')
        const m = String(d.minutes()).padStart(2, '0')
        const s = String(d.seconds()).padStart(2, '0')

        return `${h}:${m}:${s}`
}

/**
 *
 * @param startDate
 * @param endDate
 * @param enLocale
 */
export const getDateTimeFormat = (startDate?: string, endDate?: string, enLocale?: boolean): string => {
    const start = dayjs(startDate)
    const end = dayjs(endDate)

    const diffInDays = end.diff(start, 'day')

    if (diffInDays <= 1) {
        // If the difference is 1 day or less, format by hours and minutes
        return enLocale ? 'h:mm a' : 'HH:mm'
    } else if (diffInDays > 1 && diffInDays <= 7) {
        // If the difference is greater than 1 day but less than or equal to 7 days, format by date and hour
        return enLocale ? 'D MMM h:00 a' : 'D MMM HH:00'
    }

    // If the difference is more than 7 days, format by days
    return 'D MMMM'
}
