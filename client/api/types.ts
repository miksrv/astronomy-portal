export interface IRestResponse {
    status: boolean
    payload?: any
    errorText?: string
}

export interface APIResponseError {
    status?: number
    code?: number
    messages?: any
}

export interface APIResponseLogin {
    message?: string
    user?: TUserInfo
    access_token?: string
}

export type TUserInfo = {
    id: number
    name: string
    email: string
    updated_at?: string
    created_at?: string
}

// WEATHER
export interface IRestWeatherMonth extends IRestResponse {
    payload: {
        date: string
        weather: TWeatherMonth[]
    }
}

export interface IRestWeatherCurrent extends IRestResponse {
    payload: {
        timestamp: {
            server: number
            update: number
        }
        conditions: TWeatherCurrent
    }
}

// AUTH
export interface IRestAuth {
    status: boolean
    token: string
}

export interface APIRequestLogin {
    email: string
    password: string
}

export interface IRelaySet {
    index: number
    state: number
}

// SENSOR
export interface IRestSensorStatistic extends IRestResponse {
    payload: TSensorsPayload[]
}

export type TSensorsPayload = {
    time: number
    sensors: TSensors
}

export type TSensors = {
    t?: number
    h?: number
    t1?: number
    t2?: number
    t3?: number
    v1?: number
    p1?: number
    p2?: number
    p3?: number
}

export interface APIRequestCatalog {
    category: number
    coord_dec: number
    coord_ra: number
    name: string
    text: string
    title: string
}

export interface APIResponseCatalogList {
    items: TCatalog[]
}

export interface APIResponseCatalogNames {
    items: string[]
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
}

export interface APIRequestBlogList {
    limit?: number
    offset?: number
    order?: string
    sort?: 'ASC' | 'DESC'
}

export interface APIResponsePhotoList {
    items: TPhoto[]
}

export interface APIResponseBlogList {
    items: TBlog[]
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
    file_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'video/mp4'
    height: number
    width: number
}

export type TBlogReaction = {
    emoticon: string
    count: number
}

export interface IObjectListItem {
    name: string
    date: string
    frames: number
    exposure: number
    Luminance: number
    Red: number
    Green: number
    Blue: number
    Ha: number
    OIII: number
    SII: number
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
    updated: string
    category: number
    category_name?: string
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

export type TObject = {
    date: string
    exposure: number
    frames: number
    filesizes: number
    filters: TObjectFilters
}

export type TObjectFilters = {
    Luminance: TFilterItem
    Red: TFilterItem
    Green: TFilterItem
    Blue: TFilterItem
    Ha: TFilterItem
    OIII: TFilterItem
    SII: TFilterItem
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
    image: boolean
}

export type TNews = {
    date: number
    text: string
    link: string
    comments: number
    likes: number
    reposts: number
    views: number
    photos: TNewsPhotos[] | undefined
}

export type TFilesMonth = {
    date: string
    exposure: number
    frames: number
    objects: string[]
}

export type TWeatherMonth = {
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

export type TNewsPhotos = {
    full: TNewsPhotosItem
    thumb: TNewsPhotosItem
}

export type TNewsPhotosItem = {
    height: number
    width: number
    src: string
}

export type TFilterItem = {
    exposure: number
    frames: number
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
