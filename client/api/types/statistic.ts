/* Telescope */
export interface ResTelescope {
    count: number
    items: unknown // ApiModel.Statistic.Telescope[]
}

export interface ReqTelescope {
    period?: string
}
