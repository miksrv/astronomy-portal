import { ApiModel } from '@/api'

export interface ResStatus {
    /** False once the last snapshot is older than 180 s */
    online: boolean
    /** ISO, UTC */
    updatedAt: string | null
    snapshot: ApiModel.ObservatorySnapshot | null
}

export interface ResEvents {
    items: ApiModel.ObservatoryEvent[]
}
