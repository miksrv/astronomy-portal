import React from 'react'
import { Button, Message } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

export enum CheckinResultStatus {
    SUCCESS = 'success',
    DUPLICATE = 'duplicate',
    ERROR = 'error'
}

interface CheckinResultProps {
    status: CheckinResultStatus
    message: string
    name?: string
    adults?: number
    children?: number
    continueLabel: string
    continueLink?: string
    onContinue?: () => void
}

/**
 * Result card shown after a check-in attempt — shared by the staff QR
 * scanner ({@see CheckinPage}) and the link-based check-in landing page
 * ({@see CheckinIdPage}), which both call the same `events/checkin/:id`
 * endpoint and only differ in how they obtained the booking id.
 */
export const CheckinResult: React.FC<CheckinResultProps> = ({
    status,
    message,
    name,
    adults,
    children,
    continueLabel,
    continueLink,
    onContinue
}) => {
    const { t } = useTranslation()

    return (
        <Message
            type={
                status === CheckinResultStatus.SUCCESS
                    ? 'success'
                    : status === CheckinResultStatus.DUPLICATE
                      ? 'warning'
                      : 'error'
            }
            title={message}
        >
            {status !== CheckinResultStatus.ERROR && (
                <div style={{ margin: '20px 0' }}>
                    {status === CheckinResultStatus.DUPLICATE && (
                        <div>
                            <strong>{t('pages.checkin.duplicate-qr', 'Этот QR код уже был проверен ранее!')}</strong>
                        </div>
                    )}
                    {name && (
                        <div>
                            <strong>{name}</strong>
                        </div>
                    )}
                    {t('pages.checkin.members-count', 'Взрослых: {{adults}}, детей: {{children}} чел.', {
                        adults: adults || 0,
                        children: children || 0
                    })}
                </div>
            )}
            <Button
                style={{ width: '100%' }}
                mode={'secondary'}
                link={continueLink}
                onClick={onContinue}
            >
                {continueLabel}
            </Button>
        </Message>
    )
}
