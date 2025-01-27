export * as Weather from './weather'
export * as Statistic from './statistic'
export * as Relay from './relay'
export * as Events from './events'
export * as Photos from './photos'
export * as Files from './files'
export * as Category from './category'
export * as Objects from './objects'
export * as Equipment from './equipment'
export * as Author from './author'
export * as Auth from './auth'

export type Locale = 'en' | 'ru'

export interface ResError {
    status?: number
    code?: number
    messages?: any
}

export type DateTime = {
    date: string
    timezone_type: number
    timezone: string
}
