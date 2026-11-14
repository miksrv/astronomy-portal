import React from 'react'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ACTIVE_STATUSES } from './constants'
import { JobsList } from './JobsList'

/** The jobs shown on the dashboard: what the telescope shoots next */
const NEXT = 2

interface TelescopeWidgetProps {
    className?: string
}

/**
 * The telescope's queue on the /observatory dashboard: the next jobs it will shoot, the same
 * cards as on /observatory/jobs, and the way there on the heading's line.
 */
export const TelescopeWidget: React.FC<TelescopeWidgetProps> = ({ className }) => {
    const { t } = useTranslation()

    return (
        <JobsList
            id={'telescope-next'}
            className={className}
            title={t('components.pages.observatory.telescope-jobs.widget-title', 'Очередь телескопа')}
            numbered={true}
            perPage={NEXT}
            query={{ sort: 'queue', status: ACTIVE_STATUSES }}
            action={
                <Link href={'/observatory/jobs'}>
                    {t('components.pages.observatory.telescope-jobs.widget-all', 'Все задания')}
                </Link>
            }
            empty={t(
                'components.pages.observatory.telescope-jobs.widget-empty',
                'Очередь пуста — в ясную ночь телескоп ищет сверхновые.'
            )}
        />
    )
}
