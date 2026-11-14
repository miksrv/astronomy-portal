import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { StatusBadge } from '@/components/ui/status-badge/StatusBadge'

import { STATUS_TONE } from './constants'
import { displayStatus, statusLabel } from './utils'

interface JobStatusBadgeProps {
    job: ApiModel.TelescopeJob
}

/** A job's status as the site shows it (see `displayStatus`), and "Закреплено" beside it */
export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({ job }) => {
    const { t } = useTranslation()
    const status = displayStatus(job)

    return (
        <>
            {job.pinned && status !== 'paused' && (
                <StatusBadge tone={'accent'}>
                    {t('components.pages.observatory.telescope-jobs.pinned', 'Закреплено')}
                </StatusBadge>
            )}
            <StatusBadge
                tone={STATUS_TONE[status]}
                dot={status === 'running'}
            >
                {statusLabel(status, t)}
            </StatusBadge>
        </>
    )
}
