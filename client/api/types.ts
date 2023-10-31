export interface APIResponseError {
    status?: number
    code?: number
    messages?: any
}

export interface APIResponseUploadPhoto {
    image_name: string
    image_ext: string
    image_size: number
}

export interface APIResponseLogin {
    message?: string
    user?: TUserInfo
    token?: string
    auth?: boolean
}

export type TUserInfo = {
    id: number
    name: string
    email: string
    updated_at?: string
    created_at?: string
}

export interface APIResponseWeatherCurrent {
    timestamp: {
        server: number
        update: number
    }
    conditions: TWeatherCurrent
}

export interface APIResponseWeatherStatistic {
    date: string
    weather: TWeatherStatistic[]
}

export interface APIRequestLogin {
    email: string
    password: string
}

// export type TSensorsPayload = {
//     time: number
//     sensors: TSensors
// }
//
// export type TSensors = {
//     t?: number
//     h?: number
//     t1?: number
//     t2?: number
//     t3?: number
//     v1?: number
//     p1?: number
//     p2?: number
//     p3?: number
// }

export interface APIResponseRelayList {
    items: TRelayItem[]
    light: {
        cooldown: number
        counter: number
        enable: boolean
    }
}

export interface APIRequestRelaySet {
    id: number
    state: number
}

export interface APIResponseRelaySet {
    id: number
    state: number
    result: boolean
}

export interface APIRequestPhoto {
    id: number
    object: string
    date: string
    author_id: number
    image_name: string
    image_ext: string
    filters?: TFilters
}

export interface APIRequestCatalog {
    category: number
    coord_dec: number
    coord_ra: number
    name: string
    text: string
    title: string
    image?: string
    source_link?: string
}

export interface APIResponseCatalogList {
    items: TCatalog[]
}

export interface APIResponseCatalogNames {
    items: string[]
}

export interface APIResponseStatisticTelescope {
    count: number
    items: TStatisticTelescope[]
}

export interface APIResponsePhotoListNames {
    items: string[]
}

export interface APIResponseStatistic {
    photos_count: number
    catalog_count: number
    frames_count: number
    total_exposure: number
    files_size: number
}

export interface APIResponseCategoryList {
    items: TCategory[]
}

export interface APIResponseAuthorList {
    items: TAuthor[]
}

export interface APIRequestPhotoList {
    object?: string
    limit?: number
    order?: 'random' | keyof TPhoto
}
export interface APIRequestTelescope {
    period?: string
}

export interface APIRequestWeatherStatistic {
    period?: string
}

export interface APIRequestBlogList {
    limit?: number
    offset?: number
    order?: string
    sort?: 'ASC' | 'DESC'
}

export type TStatisticTelescope = {
    telescope_date: string
    total_exposure: number
    frames_count: number
    catalog_items: string[]
}

export interface APIRequestBlogListPopular {
    limit?: number
}

export interface APIResponsePhotoList {
    items: TPhoto[]
}

export interface APIResponseBlogList {
    items: TBlog[]
    total: number
}

export interface APIResponseBlogStatistic {
    users: number
}

export type TRelayItem = {
    id: number
    name: string
    state: number
}

export type TBlog = {
    id: number
    telegram_id: number
    telegram_date: number
    group_id: number
    views?: number
    forwards?: number
    replies?: number
    text: string
    reactions?: TBlogReaction[]
    media?: TBlogMedia[]
}

export type TBlogMedia = {
    file: string
    file_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'video/mp4' | string
    height: number
    width: number
}

export type TBlogReaction = {
    emoticon: string
    count: number
}

export type TCategory = {
    id: number
    name: string
    object_count?: number
}

export type TCatalog = {
    name: string
    title: string
    text: string
    image?: string
    updated: string
    category: number
    category_name?: string
    source_link?: string
    coord_ra: number
    coord_dec: number
    statistic: TStatistic
    filters: TFilters
    files?: TFIle[]
}

export type TAuthor = {
    id: number
    name: string
    link?: string
    photo_count?: number
}

export type TPhoto = {
    id: number
    object: string
    date: string
    author?: TAuthor
    image_name: string
    image_ext: string
    image_size: number
    image_width: number
    image_height: number
    custom?: boolean
    statistic: TStatistic
    filters: TFilters
}

export type TStatistic = {
    frames: number
    data_size: number
    exposure: number
}

export type TFilters = {
    luminance?: TFiltersItem
    red?: TFiltersItem
    green?: TFiltersItem
    blue?: TFiltersItem
    hydrogen?: TFiltersItem
    oxygen?: TFiltersItem
    sulfur?: TFiltersItem
    clear?: TFiltersItem
}

export type TFiltersItem = {
    exposure: number
    frames: number
}

export enum TFilterTypes {
    luminance = 'luminance',
    red = 'red',
    green = 'green',
    blue = 'blue',
    hydrogen = 'hydrogen',
    oxygen = 'oxygen',
    sulfur = 'sulfur',
    clear = 'clear'
}

export type TFIle = {
    id: string
    object: string
    date_obs: string
    filter: TFilterTypes
    exptime: number
    file_name: string
    ccd_temp: number
    offset: number
    gain: number
    dec: number
    ra: number
    star_count: number
    sky_background: number
    hfr: number
    preview: boolean
}

export type TWeatherStatistic = {
    date: string
    clouds: number
    temperature: number
    wind_speed: number
}

export type TWeatherCurrent = {
    condition_id: number
    temperature: number
    temperature_feels: number
    humidity: number
    pressure: number
    wind_speed: number
    wind_gust: number
    wind_degree: number
    clouds: number
    precipitation: number
    illumination: number
    uvindex: number
}

export const FilterList: TFilterTypes[] = [
    TFilterTypes.luminance,
    TFilterTypes.red,
    TFilterTypes.green,
    TFilterTypes.blue,
    TFilterTypes.hydrogen,
    TFilterTypes.oxygen,
    TFilterTypes.sulfur
]
