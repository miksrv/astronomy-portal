import React from 'react'

import { RefundButton } from './RefundButton'
import { RegistrationRow } from './types'
import { VerifyPaymentButton } from './VerifyPaymentButton'

import styles from './styles.module.sass'

interface RegistrationActionsProps {
    eventId: string
    registration: RegistrationRow
}

export const RegistrationActions: React.FC<RegistrationActionsProps> = ({ eventId, registration }) => {
    if (!registration.paymentOrderId) {
        return <span className={styles.noPayment}>{'—'}</span>
    }

    return (
        <div className={styles.actionsCell}>
            <VerifyPaymentButton
                eventId={eventId}
                registration={registration}
            />

            <RefundButton
                eventId={eventId}
                registration={registration}
            />
        </div>
    )
}
