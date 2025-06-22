export * as Auth from './auth'
export * as Author from './author'
export * as Category from './category'
export * as Equipment from './equipment'
export * as Events from './events'
export * as Files from './files'
export * as Objects from './objects'
export * as Photos from './photos'
export * as Relay from './relay'
export * as SiteMap from './sitemap'
export * as Statistic from './statistic'
export * as Weather from './weather'

export type Locale = 'en' | 'ru'

export interface ResError {
    status?: number
    code?: number
    messages: {
        error?: string
    }
}

export type DateTime = {
    date: string
    timezone_type: number
    timezone: string
}
