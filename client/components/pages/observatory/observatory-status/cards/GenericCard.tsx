import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'

import { CardNote, DeviceCard } from '../device-card'

interface GenericCardProps {
    role: ApiModel.DeviceRole
    name?: string | null
    connected: boolean
    driver?: ApiModel.DeviceDriver | null
    /** INDI properties of the device in Alert */
    alerts?: string[]
    stale?: boolean
    /** The role has readings, but the agent sent none (the device is connected, the section is empty) */
    expectsData?: boolean
}

/** A device without readings worth showing: only its name, connection and driver */
export const GenericCard: React.FC<GenericCardProps> = ({
    role,
    name,
    connected,
    driver,
    alerts,
    stale,
    expectsData
}) => {
    const { t } = useTranslation()

    return (
        <DeviceCard
            deviceRole={role}
            name={name}
            connected={connected}
            driver={driver}
            alerts={alerts}
            stale={stale}
        >
            {expectsData && (
                <CardNote>{t('components.pages.observatory.status.no-readings', 'Показаний пока нет')}</CardNote>
            )}
        </DeviceCard>
    )
}
