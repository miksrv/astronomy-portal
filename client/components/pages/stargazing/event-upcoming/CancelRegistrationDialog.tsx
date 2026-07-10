import React from 'react'
import { Button, Dialog } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'

import styles from './styles.module.sass'

interface CancelRegistrationDialogProps {
    eventId?: string
    isPaidConfirmedBooking: boolean
    open: boolean
    onClose: () => void
    onCancelled: () => void
}

/**
 * Confirmation dialog for the "cancel my registration" flow — owns the cancel
 * API call itself so the parent only needs to toggle `open`. Meant to be
 * mounted via `next/dynamic` since most visitors never open it.
 */
export const CancelRegistrationDialog: React.FC<CancelRegistrationDialogProps> = ({
    eventId,
    isPaidConfirmedBooking,
    open,
    onClose,
    onCancelled
}) => {
    const { t } = useTranslation()

    const [cancelRegistration, { isLoading }] = API.useEventsCancelRegistrationPostMutation()

    const handleConfirm = async () => {
        try {
            await cancelRegistration({ eventId: eventId || '' }).unwrap()
            onClose()
            onCancelled()
        } catch {
            onClose()
        }
    }

    return (
        <Dialog
            title={t(
                'components.pages.stargazing.event-upcoming.confirm-cancel-title',
                'Подтвердите отмену бронирования'
            )}
            open={open}
            onCloseDialog={onClose}
        >
            <div className={styles.confirmContent}>
                <p>
                    {t(
                        'components.pages.stargazing.event-upcoming.confirm-cancel-text-1',
                        'Если вы отмените своё бронирование на этот астровыезд, то освободившимися местами смогут воспользоваться другие участники, которые хотят поехать.'
                    )}
                </p>
                <p>
                    {t(
                        'components.pages.stargazing.event-upcoming.confirm-cancel-text-2',
                        'Вы сможете повторно зарегистрироваться на этот астровыезд, если места ещё будут свободны.'
                    )}
                </p>
                {isPaidConfirmedBooking && (
                    <p>
                        {t(
                            'components.pages.stargazing.event-upcoming.confirm-cancel-refund-text',
                            'Оплата за билет будет автоматически возвращена на карту, с которой производилась оплата, в течение 1–10 рабочих дней.'
                        )}
                    </p>
                )}
            </div>
            <div className={styles.confirmationFooter}>
                <Button
                    mode={'secondary'}
                    onClick={onClose}
                >
                    {t('components.pages.stargazing.event-upcoming.cancel', 'Отмена')}
                </Button>

                <Button
                    variant={'negative'}
                    mode={'primary'}
                    loading={isLoading}
                    disabled={isLoading}
                    onClick={handleConfirm}
                >
                    {t('components.pages.stargazing.event-upcoming.cancel-booking', 'Отменить бронирование')}
                </Button>
            </div>
        </Dialog>
    )
}
