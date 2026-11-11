import { ApiModel } from '@/api'

/** `GET /telescope/config` — what the job form needs */
export interface ResConfig {
    filters: ApiModel.FilterTypes[]
    /** Name (L, LRGB, RGB, HOO, SHO) → plan; only the presets the wheel can shoot */
    presets: Record<string, ApiModel.TelescopePlanRow[]>
    altitudeFloor: number
    defaultMinAltitude: number
    /** Total exposure of a job (users), seconds */
    maxExposureSeconds: number
    maxActiveJobs: number
    exposureMin: number
    exposureMax: number
    maxFramesPerFilter: number
    /** Signed in only */
    activeJobs?: number
    /** `telescope.manage`: no limits (only the wheel's filters and the altitude floor) */
    unlimited?: boolean
}

export interface ReqList {
    /** The signed-in user's own jobs, in any status */
    mine?: boolean
    /** `telescope.manage`: every job, rejected and cancelled too */
    all?: boolean
    status?: ApiModel.TelescopeJobStatus[]
    /** `queue` — what the observatory shoots next first (running, the queue, held, pending, finished) */
    sort?: 'queue'
    limit?: number
    offset?: number
}

export interface ResList {
    items: ApiModel.TelescopeJob[]
    count: number
}

export interface ReqCreate {
    targetName: string
    object?: string | null
    ra: number
    dec: number
    mode: 'simple' | 'pro'
    preset?: string
    plan?: ApiModel.TelescopePlanRow[]
    minAltitude?: number | null
    minMoonSeparation?: number | null
    validUntil?: string | null
}

export interface ResCreate {
    message: string
    job: ApiModel.TelescopeJob
}

export type ResCancel = ResCreate

export interface ReqPatch {
    id: string
    version: number
    priority?: number
    pinned?: boolean
    held?: boolean
}

export interface ResTonight {
    night: string
    autonomousMode: boolean
    plan: ApiModel.TelescopeTonightPlan | null
    /** `telescope.manage` only */
    report?: ApiModel.TelescopeReport
}
