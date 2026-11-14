import { ApiModel } from '@/api'
import { StatusTone } from '@/components/ui/status-badge/StatusBadge'

import type { JobDisplayStatus } from './utils'

/** Waiting for the observatory or being shot */
export const ACTIVE_STATUSES: ApiModel.TelescopeJobStatus[] = ['pending', 'approved', 'queued', 'running']

/** Done, one way or another, as everyone sees them */
export const FINISHED_STATUSES: ApiModel.TelescopeJobStatus[] = ['completed', 'expired', 'failed']

/** Seen by the author and managers only */
export const PRIVATE_STATUSES: ApiModel.TelescopeJobStatus[] = ['rejected', 'cancelled']

/** Never change again */
export const FINAL_STATUSES: ApiModel.TelescopeJobStatus[] = [...FINISHED_STATUSES, ...PRIVATE_STATUSES]

export const STATUS_TONE: Record<JobDisplayStatus, StatusTone> = {
    cancelling: 'neutral',
    paused: 'neutral',
    pending: 'warning',
    approved: 'accent',
    queued: 'accent',
    running: 'positive',
    completed: 'positive',
    rejected: 'danger',
    cancelled: 'neutral',
    expired: 'neutral',
    failed: 'danger'
}

/** The job form: its own plan instead of a preset, and the "look it up in SIMBAD" option of the search */
export const CUSTOM = 'custom'
export const SIMBAD_OPTION = '__simbad__'

/** The first row of one's own plan, and of every added one */
export const DEFAULT_ROW: ApiModel.TelescopePlanRow = { count: 10, exposure: 300, filter: 'L' }

/** Field errors the job form shows next to their inputs (the plan's rows too, see `isShownField`) */
export const SHOWN_FIELDS = [
    'targetName',
    'ra',
    'dec',
    'plan',
    'preset',
    'mode',
    'minAltitude',
    'minMoonSeparation',
    'validUntil'
]

/** The jobs list asks for this many at once */
export const PAGE_SIZE = 10

/** Admin priority steps (the API accepts −1000…1000) */
export const PRIORITY_LIMIT = 1000

/** The star map of the job targets: no Celestial controls, the zoom buttons of `StarMap` instead */
export const MAP_CONFIG = {
    controls: false,
    interactive: false,
    // A small field around one target: a local projection keeps it true to shape. The site's
    // default mercator stretches the sky by 1/cos(dec) — ×1.7 already at +54° (M 101)
    projection: 'stereographic',
    zoomextend: 10
}
