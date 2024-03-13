import { ApiModel } from '@/api'

/* Current */
export interface ResCurrent {
    timestamp: {
        server: number
        update: number
    }
    conditions: ApiModel.Weather
}

/* Statistic */
export interface ReqStatistic {
    period?: string
}

export interface ResStatistic {
    date: string
    weather: ApiModel.Statistic.Weather[]
}
