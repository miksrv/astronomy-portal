import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { StatusBadge, StatusTone } from '@/components/ui'

import { DeviceCard, Fact, Facts } from '../device-card'

import styles from '../device-card/styles.module.sass'

interface RoofCardProps {
    roof: NonNullable<ApiModel.ObservatorySnapshot['roof']>
    name?: string | null
    connected: boolean
    driver?: ApiModel.DeviceDriver | null
    /** INDI properties of the device in Alert */
    alerts?: string[]
    stale?: boolean
}

const ROOF_TONES: Record<ApiModel.RoofState, StatusTone> = {
    open: 'positive',
    closed: 'neutral',
    moving: 'accent',
    unknown: 'warning'
}

/** The roll-off roof: open, closed or on the move, and whether the telescope sits in its park position */
export const RoofCard: React.FC<RoofCardProps> = ({ roof, name, connected, driver, alerts, stale }) => {
    const { t } = useTranslation()

    const labels: Record<ApiModel.RoofState, string> = {
        open: t('components.pages.observatory.status.roof-open', 'Открыта'),
        closed: t('components.pages.observatory.status.roof-closed', 'Закрыта'),
        moving: t('components.pages.observatory.status.roof-moving', 'Движется'),
        unknown: t('components.pages.observatory.status.roof-unknown', 'Неизвестно')
    }

    return (
        <DeviceCard
            deviceRole={'roof'}
            name={name}
            connected={connected}
            driver={driver}
            alerts={alerts}
            stale={stale}
            state={
                <StatusBadge
                    tone={ROOF_TONES[roof.state] ?? 'warning'}
                    dot={roof.state === 'moving'}
                >
                    {labels[roof.state] ?? labels.unknown}
                </StatusBadge>
            }
        >
            {roof.parked != null && (
                <Facts className={styles.single}>
                    <Fact
                        label={t(
                            'components.pages.observatory.status.roof-park-switches',
                            'Концевики парковки телескопа'
                        )}
                    >
                        {roof.parked
                            ? t('components.pages.observatory.status.roof-telescope-parked', 'Телескоп в парковке')
                            : t(
                                  'components.pages.observatory.status.roof-telescope-not-parked',
                                  'Телескоп не в парковке'
                              )}
                    </Fact>
                </Facts>
            )}
        </DeviceCard>
    )
}
