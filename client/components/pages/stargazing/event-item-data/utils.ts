import { TFunction } from 'i18next'

import { ApiModel } from '@/api'

export const averageOf = (items: ApiModel.Weather[], key: keyof ApiModel.Weather): number | undefined => {
    const values = items.map((item) => item[key]).filter((value): value is number => typeof value === 'number')

    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined
}

export const formatTemperature = (value?: number): string | undefined => {
    if (value === undefined) {
        return undefined
    }

    const rounded = Math.round(value)

    return `${rounded > 0 ? '+' : ''}${rounded}°C`
}

export const getCloudsDescription = (clouds: number, t: TFunction): string => {
    if (clouds <= 20) {
        return t('pages.stargazing.event-weather-clear', 'Ясно')
    }

    if (clouds <= 50) {
        return t('pages.stargazing.event-weather-slightly-cloudy', 'Малооблачно')
    }

    if (clouds <= 80) {
        return t('pages.stargazing.event-weather-partly-cloudy', 'Облачно с прояснениями')
    }

    return t('pages.stargazing.event-weather-cloudy', 'Облачно')
}
