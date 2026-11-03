import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { StatusBadge } from '@/components/ui'

import { PhotoSolveState } from './usePhotoSolve'

import styles from './styles.module.sass'

interface PhotoSolveStatusProps {
    solve: PhotoSolveState
}

/**
 * The state of a running or failed plate solve, under the photo's title for its editor. Nothing
 * while there is nothing to wait for: starting a solve over is an item of the page's "⋯" menu.
 */
export const PhotoSolveStatus: React.FC<PhotoSolveStatusProps> = ({ solve }) => {
    const { t } = useTranslation()
    const { inProgress, status, failure } = solve

    if (!inProgress && !failure) {
        return null
    }

    return (
        <span className={styles.photoSolveStatus}>
            {inProgress && (
                <StatusBadge
                    tone={'neutral'}
                    dot={true}
                >
                    {status === 'pending'
                        ? t('components.pages.photos.photo-solve-status.pending', 'Привязка к небу: отправляем снимок…')
                        : t('components.pages.photos.photo-solve-status.solving', 'Привязка к небу: решается…')}
                </StatusBadge>
            )}
            {failure && (
                <StatusBadge
                    tone={'warning'}
                    className={styles.error}
                >
                    {t('components.pages.photos.photo-solve-status.failed', 'Привязка к небу не удалась: {{error}}', {
                        error: failure
                    })}
                </StatusBadge>
            )}
        </span>
    )
}
