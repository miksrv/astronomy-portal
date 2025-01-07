// TODO Refactor this file to use the new API
export type Telescope = {
    telescope_date: string
    total_exposure: number
    frames_count: number
    catalog_items: string[]
}
//
// export type Weather = {
//     date: string
//     clouds: number
//     temperature: number
//     wind_speed: number
// }

export type Statistic = {
    frames?: number
    exposure?: number
    fileSize?: number
}
