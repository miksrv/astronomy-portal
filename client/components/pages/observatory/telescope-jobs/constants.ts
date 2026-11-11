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

/** The observatory's time zone: darkness and frame times are shown in it */
export const OBSERVATORY_TIME_ZONE = 'Asia/Yekaterinburg'

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
