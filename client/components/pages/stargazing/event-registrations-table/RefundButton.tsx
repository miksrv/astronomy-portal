import React, { useState } from 'react'
import { Button } from 'simple-react-ui-kit'

import dynamic from 'next/dynamic'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { useAppSelector } from '@/api/store'
import { hasPermission } from '@/utils/permissions'

import { RegistrationRow } from './types'

const RefundRegistrationDialog = dynamic(
    () => import('./RefundRegistrationDialog').then((mod) => mod.RefundRegistrationDialog),
    { ssr: false }
)

interface RefundButtonProps {
    eventId: string
    registration: RegistrationRow
}

/**
 * Force-refund trigger — only meaningful for a booking that's actually
 * confirmed, active, and paid; a pending/failed/already-cancelled/unpaid
 * registration has nothing to refund via this action (an unpaid pending
 * hold is released by the ordinary self-cancel flow instead).
 */
export const RefundButton: React.FC<RefundButtonProps> = ({ eventId, registration }) => {
    const { t } = useTranslation()
    const [dialogOpen, setDialogOpen] = useState(false)
    const user = useAppSelector((state) => state.auth.user)

    const canRefund =
        hasPermission(user, ApiModel.Permission.EVENTS_REFUND) &&
        registration.status === 'confirmed' &&
        !registration.deletedAt &&
        registration.paymentStatus === 'paid'

    if (!canRefund) {
        return null
    }

    return (
        <>
            <Button
                size={'small'}
                mode={'outline'}
                variant={'negative'}
                onClick={() => setDialogOpen(true)}
            >
                {t('pages.stargazing.registrations-refund', 'Возврат')}
            </Button>

            {dialogOpen && (
                <RefundRegistrationDialog
                    eventId={eventId}
                    registrationId={registration.id}
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                />
            )}
        </>
    )
}
