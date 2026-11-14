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

/** `site` — a visitor's job; `patrol` — the observatory agent's own (the supernova patrol, no author) */
export type TelescopeJobSource = 'site' | 'patrol'

/**
 * One night of the supernova patrol as a job: made by the night's first visit the observatory
 * reported, running while the night lasts, completed after the dawn
 */
export interface TelescopePatrolNight {
    /** `YYYY-MM-DD`, the local date of the evening */
    night: string
    /** Galaxies shot so far */
    visitsDone: number
    /** Galaxies the observatory planned for the night (never less than shot) */
    visitsPlanned: number
}

/** One galaxy of a patrol night */
export interface TelescopePatrolVisit {
    target: {
        id: number
        name: string
        /** Our catalog object (`catalog_name`, the link to its page), when the galaxy is in the catalog */
        object: string | null
        /** J2000, degrees */
        ra: number
        dec: number
        /** SIMBAD's short type code */
        type: string | null
        magnitude: number | null
    }
    /** The first frame, UTC */
    time: string
    /** The latest frame so far, UTC */
    lastFrame: string | null
    frames: number
}

export interface TelescopeJob {
    id: string
    source: TelescopeJobSource
    targetName: string
    /** Our catalog object (`catalog_name`), when the target is one */
    object: string | null
    /** J2000, degrees; null for a patrol night (its targets are its `visits`) */
    ra: number | null
    dec: number | null
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
    /** null for the agent's own jobs (`source` = patrol) */
    author: TelescopeJobAuthor | null
    /** A patrol night (`source` = patrol), otherwise null */
    patrol: TelescopePatrolNight | null
    /** A patrol night's visits, in the order they were shot (`GET /telescope/jobs/:id` only) */
    visits?: TelescopePatrolVisit[]
    createdAt: string
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
    patrol: { enabled: boolean; targets: string[] }
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
    patrol?: {
        enabled: boolean
        targets: number
        candidates: number
        planned: Array<{ id: number; name: string; score: number }>
    }
    autonomousMode?: boolean
}
