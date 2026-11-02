import React, { useEffect, useRef } from 'react'
import { Button } from 'simple-react-ui-kit'

import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel } from '@/api'
import { StatusBadge } from '@/components/ui'
import { getErrorMessage } from '@/utils/errors'

import styles from './styles.module.sass'

/** Seconds between the steps of a running solve */
const STEP_INTERVAL = 8_000

interface PhotoSolveStatusProps {
    photoId: string
}

/**
 * The editor's view of a photo's plate solve, in the page header: a badge with its state and
 * the button to start it over. A solve runs as steps the browser asks for one after another
 * (upload, then "is it done yet?"), so a photo gets solved while the editor looks at its page
 * right after the upload - no background worker. When it completes, the page is reloaded in
 * place to show the labels and the grid.
 */
export const PhotoSolveStatus: React.FC<PhotoSolveStatusProps> = ({ photoId }) => {
    const { t } = useTranslation()
    const router = useRouter()

    // `currentData` (not `data`): the page stays mounted between photos, and the previous photo's
    // state must not drive a step on this one
    const { currentData: data, error, isLoading } = API.usePhotosGetAstrometryQuery(photoId)
    const [solve, { data: stepped, error: stepError, isLoading: stepping }] = API.usePhotosSolveMutation()

    // The step's answer is newer than the query's cache until the latter refetches
    const current: ApiModel.PhotoAstrometry | undefined = stepped?.photoId === photoId ? stepped : data
    const status = current?.status
    // A step that failed to reach the server ends the chain: the button comes back for a retry
    const inProgress = (status === 'pending' || status === 'solving') && !stepError
    const notSolvedYet = !isLoading && !current && !!error

    // A running solve is stepped every few seconds; done - the page gets its new props
    const wasInProgress = useRef(false)

    useEffect(() => {
        if (!inProgress) {
            if (wasInProgress.current && status === 'success') {
                void router.replace(router.asPath, undefined, { scroll: false })
            }

            wasInProgress.current = false

            return
        }

        wasInProgress.current = true
        const timer = window.setTimeout(() => void solve({ id: photoId }), STEP_INTERVAL)

        return () => window.clearTimeout(timer)
        // `current` changes with every step's answer, which is what restarts the timer
    }, [inProgress, status, current, photoId])

    const failure = status === 'failed' ? current?.error : stepError ? getErrorMessage(stepError) : undefined

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
            {!inProgress && (
                <Button
                    mode={'secondary'}
                    icon={'Position'}
                    loading={stepping}
                    disabled={stepping}
                    label={
                        notSolvedYet || status === 'failed' || stepError
                            ? t('components.pages.photos.photo-solve-status.start', 'Привязать к небу')
                            : t('components.pages.photos.photo-solve-status.restart', 'Перерешать')
                    }
                    onClick={() => void solve({ id: photoId, restart: true })}
                />
            )}
        </span>
    )
}
