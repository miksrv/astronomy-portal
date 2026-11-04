import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { StatusBadge } from '@/components/ui'

import { DeviceCard, Fact, Facts, Meter } from '../device-card'
import { getPercent, isNumber } from '../utils'

import { useNumber } from './useNumber'

interface FocuserCardProps {
    focuser: ApiModel.ObservatoryFocuser
    name?: string | null
    connected: boolean
    driver?: ApiModel.DeviceDriver | null
    /** INDI properties of the device in Alert */
    alerts?: string[]
    stale?: boolean
}

/** The focuser: where the focus is, as a position and against the end of the travel */
export const FocuserCard: React.FC<FocuserCardProps> = ({ focuser, name, connected, driver, alerts, stale }) => {
    const { t } = useTranslation()
    const number = useNumber()

    const hasTravel = isNumber(focuser.position) && isNumber(focuser.max) && focuser.max > 0

    return (
        <DeviceCard
            deviceRole={'focuser'}
            name={name}
            connected={connected}
            driver={driver}
            alerts={alerts}
            stale={stale}
            state={
                focuser.moving ? (
                    <StatusBadge
                        tone={'accent'}
                        dot={true}
                    >
                        {t('components.pages.observatory.status.focuser-moving-badge', 'Движется')}
                    </StatusBadge>
                ) : undefined
            }
        >
            <Facts>
                <Fact
                    label={t('components.pages.observatory.status.focuser-position', 'Позиция')}
                    note={
                        hasTravel
                            ? t('components.pages.observatory.status.focuser-of-max', 'из {{max}}', {
                                  max: number(focuser.max as number, 0)
                              })
                            : undefined
                    }
                >
                    {isNumber(focuser.position) ? number(focuser.position, 0) : '—'}
                    {hasTravel && (
                        <Meter
                            percent={getPercent(focuser.position, focuser.max)}
                            label={t('components.pages.observatory.status.focuser-travel', 'Положение в пределах хода')}
                        />
                    )}
                </Fact>

                {isNumber(focuser.temperature) && (
                    <Fact label={t('components.pages.observatory.status.temperature', 'Температура')}>
                        {`${number(focuser.temperature)}℃`}
                    </Fact>
                )}
            </Facts>
        </DeviceCard>
    )
}
