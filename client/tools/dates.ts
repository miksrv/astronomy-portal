import dayjs, { Dayjs } from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

export const TIME_ZONE = 'Asia/Yekaterinburg'

export const formatDate = (
    date?: string | Date | Dayjs,
    format?: string
): string | undefined =>
    date ? dayjs(date).format(format ?? 'DD.MM.YYYY, HH:mm') : undefined

export const formatDateFromUTC = (
    utc?: number,
    format: string = 'D MMMM YYYY, HH:mm'
): string =>
    utc
        ? dayjs
              .unix(utc / 1000)
              .utc(true)
              .tz(TIME_ZONE)
              .format(format)
        : ''

/**
 *
 * @param startDate
 * @param endDate
 * @param enLocale
 */
export const getDateTimeFormat = (
    startDate?: string,
    endDate?: string,
    enLocale?: boolean
): string => {
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
