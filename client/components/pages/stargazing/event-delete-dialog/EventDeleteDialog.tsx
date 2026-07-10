import React from 'react'
import { Button, Dialog } from 'simple-react-ui-kit'

import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { getErrorMessage } from '@/utils/errors'

import styles from './styles.module.sass'

export interface EventDeleteDialogProps {
    eventId?: string
    open: boolean
    onClose: () => void
}

/**
 * Admin-only "delete event" confirmation — owns the delete API call itself
 * (and the page refresh afterwards) so callers only need to toggle `open`.
 * Meant to be mounted via `next/dynamic` (rare, admin-only) wherever an event
 * can be deleted from: `/stargazing`, `/stargazing/[name]`, `/stargazing/history`.
 */
export const EventDeleteDialog: React.FC<EventDeleteDialogProps> = ({ eventId, open, onClose }) => {
    const { t } = useTranslation()
    const router = useRouter()

    const [deleteEvent, { isLoading, error }] = API.useEventDeleteMutation()

    const handleConfirm = async () => {
        if (!eventId) {
            return
        }

        try {
            await deleteEvent(eventId).unwrap()
            onClose()
            await router.replace(router.asPath)
        } catch {
            // Error surfaces from `error` below
        }
    }

    return (
        <Dialog
            title={t('components.pages.stargazing.event-delete-dialog.title', 'Удалить астровыезд?')}
            open={open}
            onCloseDialog={onClose}
        >
            <div className={styles.confirmContent}>
                <p>
                    {t(
                        'components.pages.stargazing.event-delete-dialog.text',
                        'Это действие нельзя отменить. Астровыезд будет удалён безвозвратно.'
                    )}
                </p>

                {error && (
                    <p className={styles.notifyText}>
                        {getErrorMessage(error) ||
                            t(
                                'components.pages.stargazing.event-delete-dialog.error',
                                'Не удалось удалить астровыезд. Попробуйте позже.'
                            )}
                    </p>
                )}
            </div>
            <div className={styles.confirmationFooter}>
                <Button
                    mode={'secondary'}
                    onClick={onClose}
                >
                    {t('common.cancel', 'Отмена')}
                </Button>

                <Button
                    variant={'negative'}
                    mode={'primary'}
                    loading={isLoading}
                    disabled={isLoading}
                    onClick={handleConfirm}
                >
                    {t('common.delete', 'Удалить')}
                </Button>
            </div>
        </Dialog>
    )
}
