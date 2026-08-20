import React from 'react'
import { Button, Dialog, Message } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { getErrorMessage } from '@/utils/errors'

import styles from './styles.module.sass'

export interface RefundRegistrationDialogProps {
    eventId: string
    registrationId: string
    open: boolean
    onClose: () => void
}

/**
 * Admin-only "force refund" confirmation — owns the refund API call itself.
 * While the request is in flight the dialog cannot be closed (no close
 * button, overlay/close callback is a no-op) since a bank call is
 * irreversible mid-flight; once the bank responds, the result (success
 * message or the bank's error text) stays visible in the dialog until the
 * admin explicitly closes it.
 */
export const RefundRegistrationDialog: React.FC<RefundRegistrationDialogProps> = ({
    eventId,
    registrationId,
    open,
    onClose
}) => {
    const { t } = useTranslation()
    const [refund, { data, isLoading, error, reset }] = API.useEventRefundRegistrationPaymentMutation()

    const handleClose = () => {
        if (isLoading) {
            return
        }

        reset()
        onClose()
    }

    const handleConfirm = async () => {
        try {
            await refund({ eventId, id: registrationId }).unwrap()
        } catch {
            // Error surfaces from `error` below
        }
    }

    const settled = !!data || !!error

    return (
        <Dialog
            title={t('components.pages.stargazing.event-refund-dialog.title', 'Оформить возврат?')}
            open={open}
            showCloseButton={!isLoading}
            onCloseDialog={handleClose}
        >
            <div className={styles.confirmContent}>
                {!settled && (
                    <p>
                        {t(
                            'components.pages.stargazing.event-refund-dialog.text',
                            'Оплата будет полностью возвращена на карту, с которой производился платёж (обычно в течение 1–10 рабочих дней), а регистрация — аннулирована. Действие необратимо.'
                        )}
                    </p>
                )}

                {data && <p className={styles.notifySuccess}>{data.message}</p>}

                {error && (
                    <Message type={'error'}>
                        {getErrorMessage(error) ||
                            t(
                                'components.pages.stargazing.event-refund-dialog.error',
                                'Не удалось выполнить возврат. Попробуйте позже.'
                            )}
                    </Message>
                )}
            </div>
            <div className={styles.confirmationFooter}>
                {!settled && (
                    <>
                        <Button
                            mode={'secondary'}
                            disabled={isLoading}
                            onClick={handleClose}
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
                            {t('components.pages.stargazing.event-refund-dialog.confirm', 'Оформить возврат')}
                        </Button>
                    </>
                )}

                {settled && (
                    <Button
                        mode={'primary'}
                        onClick={handleClose}
                    >
                        {t('components.pages.stargazing.event-refund-dialog.done', 'Готово')}
                    </Button>
                )}
            </div>
        </Dialog>
    )
}
