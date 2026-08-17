import React from 'react'
import { Button } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { getErrorMessage } from '@/utils/errors'

import { RegistrationRow } from './types'

import styles from './styles.module.sass'

interface VerifyPaymentButtonProps {
    eventId: string
    registration: RegistrationRow
}

export const VerifyPaymentButton: React.FC<VerifyPaymentButtonProps> = ({ eventId, registration }) => {
    const { t } = useTranslation()
    const [verifyPayment, { data, isLoading, error }] = API.useEventVerifyRegistrationPaymentMutation()

    return (
        <div className={styles.verifyCell}>
            <Button
                size={'small'}
                mode={'outline'}
                loading={isLoading}
                onClick={() => void verifyPayment({ eventId, id: registration.id })}
            >
                {t('pages.stargazing.registrations-verify', 'Проверить')}
            </Button>

            {data && <div className={styles.verifyResult}>{data.message}</div>}
            {error && <div className={styles.verifyError}>{getErrorMessage(error)}</div>}
        </div>
    )
}
