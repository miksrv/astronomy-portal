import * as Filter from './filter'

export type Item = {
    id: string
    object: string
    date_obs: string
    filter: Filter.Type
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

export type Statistic = {
    frames: number
    data_size: number
    exposure: number
}
