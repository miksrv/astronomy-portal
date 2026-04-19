import { ApiModel } from '@/api'

/* Weather */
export interface RequestHistory {
    start_date: string
    end_date: string
}

export type ResponseHistory = ApiModel.Weather[]
