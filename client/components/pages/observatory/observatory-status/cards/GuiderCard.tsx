import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { StatusBadge } from '@/components/ui'

import { DeviceCard, Fact, Facts } from '../device-card'

interface GuiderCardProps {
    guider: ApiModel.ObservatoryGuider
    name?: string | null
    connected: boolean
    driver?: ApiModel.DeviceDriver | null
    /** INDI properties of the device in Alert */
    alerts?: string[]
    stale?: boolean
}

/** The guide camera: is it taking guiding frames and at which binning */
export const GuiderCard: React.FC<GuiderCardProps> = ({ guider, name, connected, driver, alerts, stale }) => {
    const { t } = useTranslation()

    return (
        <DeviceCard
            deviceRole={'guider'}
            name={name}
            connected={connected}
            driver={driver}
            alerts={alerts}
            stale={stale}
            state={
                guider.exposing ? (
                    <StatusBadge
                        tone={'accent'}
                        dot={true}
                    >
                        {t('components.pages.observatory.status.guider-exposing', 'Гидирует')}
                    </StatusBadge>
                ) : (
                    <StatusBadge tone={'neutral'}>
                        {t('components.pages.observatory.status.guider-idle', 'Не гидирует')}
                    </StatusBadge>
                )
            }
        >
            <Facts>
                <Fact label={t('components.pages.observatory.status.binning', 'Биннинг')}>
                    {`${guider.binning}×${guider.binning}`}
                </Fact>
            </Facts>
        </DeviceCard>
    )
}
