export * as Auth from './auth'
export * as Category from './category'
export * as Comments from './comments'
export * as Equipment from './equipment'
export * as Events from './events'
export * as Files from './files'
export * as Mailings from './mailings'
export * as Objects from './objects'
export * as Photos from './photos'
export * as Push from './push'
export * as Relay from './relay'
export * as Roles from './roles'
export * as SiteMap from './sitemap'
export * as Statistic from './statistic'
export * as Users from './users'
export * as Weather from './weather'

export type Locale = 'en' | 'ru'

/**
 * The API's error envelope (see server/app/Controllers/BaseApiController.php).
 * `message` is always present — it's what a generic error <Message> block should
 * show. `errors` is present only when the failure is tied to specific form
 * fields (validation), keyed by field name. `status` is the transport-level
 * HTTP status code, restored by `baseQueryWithErrorTransform` in `client/api/api.ts`
 * after it unwraps `FetchBaseQueryError.data` — read it instead of duplicating
 * the status code inside the response body.
 */
export interface ResError {
    status?: number
    message: string
    errors?: Record<string, string>
}

export type DateTime = {
    date: string
    timezone_type: number
    timezone: string
}
