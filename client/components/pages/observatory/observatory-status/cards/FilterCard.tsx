import React from 'react'
import { cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { StatusBadge } from '@/components/ui'

import { DeviceCard } from '../device-card'

import styles from '../device-card/styles.module.sass'

interface FilterCardProps {
    filter: ApiModel.ObservatoryFilter
    name?: string | null
    connected: boolean
    driver?: ApiModel.DeviceDriver | null
    /** INDI properties of the device in Alert */
    alerts?: string[]
    stale?: boolean
}

/** The filter wheel: every slot as a chip, the one in the light path highlighted */
export const FilterCard: React.FC<FilterCardProps> = ({ filter, name, connected, driver, alerts, stale }) => {
    const { t } = useTranslation()

    // Slots are numbered from 1; a wheel that reported no names still shows its current slot
    const slots = filter.names.length ? filter.names : filter.name ? [filter.name] : []

    return (
        <DeviceCard
            deviceRole={'filter'}
            name={name}
            connected={connected}
            driver={driver}
            alerts={alerts}
            stale={stale}
            state={
                filter.moving ? (
                    <StatusBadge
                        tone={'accent'}
                        dot={true}
                    >
                        {t('components.pages.observatory.status.filter-moving', 'Поворачивается')}
                    </StatusBadge>
                ) : undefined
            }
        >
            <ul
                className={styles.chips}
                aria-label={t('components.pages.observatory.status.filter-slots', 'Фильтры в колесе')}
            >
                {slots.map((slotName, index) => {
                    const active = index + 1 === filter.slot

                    return (
                        <li
                            key={`${index}-${slotName}`}
                            className={cn(
                                styles.chip,
                                active && styles.active,
                                active && filter.moving && styles.moving
                            )}
                            aria-current={active ? 'true' : undefined}
                        >
                            <span className={styles.slot}>{index + 1}</span>
                            {slotName}
                        </li>
                    )
                })}
            </ul>
        </DeviceCard>
    )
}
