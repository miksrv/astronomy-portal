import dayjs, { Dayjs } from 'dayjs'

export const formatDate = (
    date?: string | Date | Dayjs,
    format?: string
): string | undefined =>
    date ? dayjs(date).format(format ?? 'DD.MM.YYYY, HH:mm') : undefined
