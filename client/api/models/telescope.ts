import { ApiModel } from '@/api'

/** A telescope job's status (FEAT-30 §4.2) */
export type TelescopeJobStatus =
    'pending' | 'approved' | 'rejected' | 'queued' | 'running' | 'completed' | 'cancelled' | 'expired' | 'failed'

/** One row of a job's plan: a filter of the wheel, exposure (s) and the number of frames */
export interface TelescopePlanRow {
    filter: ApiModel.FilterTypes
    exposure: number
    count: number
}

export interface TelescopeJobAuthor {
    id: string
    /** The full name (spec decision #21) */
    name: string
    avatar?: string | null
}

export interface TelescopeJob {
    id: string
    targetName: string
    /** Our catalog object (`catalog_name`), when the target is one */
    object: string | null
    /** J2000, degrees */
    ra: number
    dec: number
    mode: 'simple' | 'pro'
    preset: string | null
    plan: TelescopePlanRow[]
    minAltitude: number
    minMoonSeparation: number | null
    /** `YYYY-MM-DD`, local date */
    validUntil: string | null
    priority: number
    pinned: boolean
    held: boolean
    status: TelescopeJobStatus
    /** Why it was rejected / failed: the author and managers only */
    statusReason: string | null
    cancelRequested: boolean
    /** The signed-in viewer's own job */
    own: boolean
    /** Frames captured per filter (absolute counts from the observatory) */
    progress: Partial<Record<ApiModel.FilterTypes, number>>
    author: TelescopeJobAuthor | null
    createdAt: string
    /** When it was last sent to be shot again ("Повторить"): the counters start from zero then */
    repeatedAt: string | null
    reviewedAt: string | null
    acceptedAt: string | null
    startedAt: string | null
    firstFrameAt: string | null
    lastFrameAt: string | null
    finishedAt: string | null
    /** `telescope.manage` only: what PATCH must send back */
    version?: number
    reviewedBy?: string | null
}

/** Tonight's plan as everyone sees it (`GET /telescope/tonight`) */
export interface TelescopeTonightPlan {
    night: string
    builtAt: string | null
    darkness: {
        nauticalStart: string | null
        nauticalEnd: string | null
        astroStart: string | null
        astroEnd: string | null
    }
    moon: { illumination: number | null }
    jobs: Array<{
        id: string
        targetName: string
        object: string | null
        /** `bb` broadband (L/R/G/B), `nb` narrowband (Hα/OIII/SII) */
        groups: string[]
        author: TelescopeJobAuthor
    }>
}

/**
 * A reason or warning of the agent: a code the site translates (`noticeText()`), with its numbers
 * and names. Older plans may still carry plain text.
 */
export type TelescopeNotice = { code: string; [param: string]: unknown } | string

/** One job in the agent's full report of the night (`telescope.manage`) */
export interface TelescopeReportJob {
    id: string
    targetName?: string
    planned: boolean
    reasons: TelescopeNotice[]
    score?: number
    observableMinutes?: number
    maxAltitude?: number
    remaining?: Partial<Record<ApiModel.FilterTypes, number>>
    groups?: string[]
}

/** The agent's full report of the night (`telescope.manage`) */
export interface TelescopeReport {
    jobs?: TelescopeReportJob[]
    warnings?: TelescopeNotice[]
    ekos?: { loaded: boolean; reason?: TelescopeNotice; jobs?: number; started?: boolean }
    autonomousMode?: boolean
}
