import React, { useState } from 'react'
import { Button, Dialog, TextArea } from 'simple-react-ui-kit'

import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, ApiType } from '@/api'
import { PageAction } from '@/components/common/page-actions/PageActions'
import { useSnackbar } from '@/hooks/useSnackbar'
import { getErrorMessage } from '@/utils/errors'

import { PRIORITY_LIMIT } from './constants'
import { canCancel, canPause, canRemove, isFinal } from './utils'

import styles from './styles.module.sass'

/** Longest reason of a rejection (the API's limit) */
const MAX_REASON = 500

interface JobActions {
    /** For the page's "⋯" menu (`AppToolbar actions`): empty when the viewer may do nothing */
    actions: PageAction[]
    /** The confirmations; render them on the page */
    dialogs: React.ReactNode
}

/**
 * What the viewer may do with a job, on its page: the author cancels it; a manager approves or
 * rejects it, pins, pauses / resumes, moves it up or down the queue, cancels and deletes it.
 */
export const useJobActions = (
    job: ApiModel.TelescopeJob | undefined,
    manager: boolean,
    /** The job is being reloaded: its `version` may be stale, a change now would get a 409 */
    fetching = false
): JobActions => {
    const { t } = useTranslation()
    const router = useRouter()
    const snackbar = useSnackbar()

    const [busy, setBusy] = useState(false)
    const [confirm, setConfirm] = useState<'cancel' | 'remove'>()
    const [rejecting, setRejecting] = useState(false)
    const [reason, setReason] = useState('')

    const [approveJob] = API.useTelescopeApproveJobMutation()
    const [rejectJob] = API.useTelescopeRejectJobMutation()
    const [cancelJob] = API.useTelescopeCancelJobMutation()
    const [removeJob] = API.useTelescopeRemoveJobMutation()
    const [patchJob] = API.useTelescopePatchJobMutation()

    // A patrol night is the observatory's own: nobody changes, cancels or deletes it
    if (!job || job.source !== 'site') {
        return { actions: [], dialogs: null }
    }

    const run = async (request: () => Promise<unknown>, done?: string): Promise<boolean> => {
        setBusy(true)

        try {
            const result = (await request()) as { message?: string } | undefined

            if (done || result?.message) {
                snackbar.push(result?.message ?? done ?? '', { type: 'success' })
            }

            return true
        } catch (error) {
            // 409: someone changed the job meanwhile — the page reloads it (tags), the reason is said
            snackbar.push(
                getErrorMessage(error) ||
                    t('components.pages.observatory.telescope-jobs.action-failed', 'Не получилось, попробуйте ещё раз'),
                { type: 'error' }
            )

            return false
        } finally {
            setBusy(false)
        }
    }

    const locked = busy || fetching
    const final = isFinal(job.status)
    const version = job.version ?? 0
    const patch = (change: Pick<ApiType.Telescope.ReqPatch, 'held' | 'pinned' | 'priority'>) => () =>
        void run(() => patchJob({ id: job.id, version, ...change }).unwrap())

    const actions: PageAction[] = []

    if (manager && job.status === 'pending') {
        actions.push(
            {
                disabled: locked,
                icon: 'CheckCircle',
                key: 'approve',
                label: t('components.pages.observatory.telescope-jobs.approve', 'Одобрить'),
                onClick: () =>
                    void run(
                        () => approveJob(job.id).unwrap(),
                        t('components.pages.observatory.telescope-jobs.approved', 'Задание одобрено')
                    )
            },
            {
                disabled: locked,
                key: 'reject',
                label: t('components.pages.observatory.telescope-jobs.reject', 'Отклонить'),
                onClick: () => {
                    setReason('')
                    setRejecting(true)
                }
            }
        )
    }

    if (manager && !final) {
        actions.push(
            {
                disabled: locked,
                key: 'pin',
                label: job.pinned
                    ? t('components.pages.observatory.telescope-jobs.unpin', 'Открепить')
                    : t('components.pages.observatory.telescope-jobs.pin', 'Закрепить'),
                onClick: patch({ pinned: !job.pinned })
            },
            ...(job.held || canPause(job)
                ? [
                      {
                          disabled: locked,
                          key: 'pause',
                          label: job.held
                              ? t('components.pages.observatory.telescope-jobs.resume', 'Возобновить')
                              : t('components.pages.observatory.telescope-jobs.pause', 'Приостановить'),
                          onClick: patch({ held: !job.held })
                      }
                  ]
                : []),
            {
                disabled: locked || job.priority >= PRIORITY_LIMIT,
                icon: 'ArrowUp',
                key: 'priority-up',
                label: t('components.pages.observatory.telescope-jobs.priority-up', 'Повысить приоритет'),
                onClick: patch({ priority: job.priority + 1 })
            },
            {
                disabled: locked || job.priority <= -PRIORITY_LIMIT,
                icon: 'ArrowDown',
                key: 'priority-down',
                label: t('components.pages.observatory.telescope-jobs.priority-down', 'Понизить приоритет'),
                onClick: patch({ priority: job.priority - 1 })
            }
        )
    }

    if ((job.own || manager) && canCancel(job)) {
        actions.push({
            disabled: locked,
            key: 'cancel',
            label: t('components.pages.observatory.telescope-jobs.cancel', 'Отменить задание'),
            onClick: () => setConfirm('cancel'),
            variant: 'negative'
        })
    }

    if (manager && canRemove(job)) {
        actions.push({
            disabled: locked,
            key: 'remove',
            label: t('components.pages.observatory.telescope-jobs.remove', 'Удалить'),
            onClick: () => setConfirm('remove'),
            variant: 'negative'
        })
    }

    const dialogs = (
        <>
            <Dialog
                open={!!confirm}
                title={
                    confirm === 'remove'
                        ? t('components.pages.observatory.telescope-jobs.remove-title', 'Удалить задание «{{name}}»?', {
                              name: job.targetName
                          })
                        : t(
                              'components.pages.observatory.telescope-jobs.cancel-title',
                              'Отменить задание «{{name}}»?',
                              {
                                  name: job.targetName
                              }
                          )
                }
                onCloseDialog={() => setConfirm(undefined)}
            >
                <p className={styles.dialogText}>
                    {confirm === 'remove'
                        ? t(
                              'components.pages.observatory.telescope-jobs.remove-text',
                              'Задание и его история удаляются насовсем, автор его больше не увидит.'
                          )
                        : // Only a job still waiting for approval is cancelled at once: an approved one
                          // may be in the observatory's schedule already, the agent confirms its cancel
                          job.status !== 'pending'
                          ? t(
                                'components.pages.observatory.telescope-jobs.cancel-text-observatory',
                                'Задание уже на обсерватории: его снимут с расписания в безопасный момент. Отснятые кадры сохранятся.'
                            )
                          : t('components.pages.observatory.telescope-jobs.cancel-text', 'Задание отменится сразу.')}
                </p>
                <div className={styles.dialogActions}>
                    <Button
                        mode={'outline'}
                        label={t('common.cancel', 'Отмена')}
                        onClick={() => setConfirm(undefined)}
                    />
                    <Button
                        mode={'primary'}
                        variant={'negative'}
                        label={
                            confirm === 'remove'
                                ? t('components.pages.observatory.telescope-jobs.remove', 'Удалить')
                                : t('components.pages.observatory.telescope-jobs.cancel', 'Отменить задание')
                        }
                        onClick={async () => {
                            const action = confirm

                            setConfirm(undefined)

                            if (action === 'remove') {
                                if (await run(() => removeJob(job.id).unwrap())) {
                                    await router.push('/observatory/jobs')
                                }
                            } else if (action === 'cancel') {
                                await run(() => cancelJob(job.id).unwrap())
                            }
                        }}
                    />
                </div>
            </Dialog>

            <Dialog
                open={rejecting}
                title={t('components.pages.observatory.telescope-jobs.reject-title', 'Отклонить задание «{{name}}»?', {
                    name: job.targetName
                })}
                onCloseDialog={() => setRejecting(false)}
            >
                <TextArea
                    label={t('components.pages.observatory.telescope-jobs.reject-reason', 'Причина (её увидит автор)')}
                    value={reason}
                    maxLength={MAX_REASON}
                    onChange={(event) => setReason(event.target.value)}
                />
                <div className={styles.dialogActions}>
                    <Button
                        mode={'outline'}
                        label={t('common.cancel', 'Отмена')}
                        onClick={() => setRejecting(false)}
                    />
                    <Button
                        mode={'primary'}
                        variant={'negative'}
                        disabled={!reason.trim()}
                        label={t('components.pages.observatory.telescope-jobs.reject', 'Отклонить')}
                        onClick={() => {
                            setRejecting(false)
                            void run(
                                () => rejectJob({ id: job.id, reason: reason.trim() }).unwrap(),
                                t('components.pages.observatory.telescope-jobs.rejected', 'Задание отклонено')
                            )
                        }}
                    />
                </div>
            </Dialog>
        </>
    )

    return { actions, dialogs }
}
