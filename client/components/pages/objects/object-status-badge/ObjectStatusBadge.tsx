import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { StatusBadge } from '@/components/ui'
import { OBJECT_STATUS_TONES, ObjectStatus } from '@/utils/objects'

interface ObjectStatusBadgeProps {
    status: ObjectStatus
    /** A dot before the text, for the larger hero badges */
    dot?: boolean
}

/** "Есть фото" / "Кадры без фото" / "Не снимался": the one place these labels live */
export const ObjectStatusBadge: React.FC<ObjectStatusBadgeProps> = ({ status, dot }) => {
    const labels = useObjectStatusLabels()

    return (
        <StatusBadge
            tone={OBJECT_STATUS_TONES[status]}
            dot={dot && status !== 'none'}
        >
            {labels[status]}
        </StatusBadge>
    )
}

/** The status labels, for the badge and the catalog's status filter */
export const useObjectStatusLabels = (): Record<ObjectStatus, string> => {
    const { t } = useTranslation()

    return {
        photo: t('components.pages.objects.objects-catalog.status-photo', 'Есть фото'),
        frames: t('components.pages.objects.objects-catalog.status-frames', 'Кадры без фото'),
        none: t('components.pages.objects.objects-catalog.status-none', 'Не снимался')
    }
}
