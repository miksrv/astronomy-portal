import { ApiModel } from '@/api'

export interface ResRelayList {
    items: ApiModel.Relay[]
    light: {
        cooldown: number
        counter: number
        enable: boolean
    }
}

/* Relay Set */
export interface ResRelaySet {
    id: number
    state: number
    result: boolean
}

export interface ReqRelaySet {
    id: number
    state: number
}
