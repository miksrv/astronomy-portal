import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { CardMeta, StatusBadge } from '@/components/ui'

import { splitAge } from './utils'

import styles from './styles.module.sass'

interface LiveMetaProps {
    /** The source reported recently enough to be trusted */
    online: boolean
    /** Whole minutes since the last report; `undefined` while unknown (loading, not hydrated) */
    minutesAgo?: number
    /**
     * Being offline is a normal state for this source (the observatory is switched off while it
     * waits for the weather): a grey "switched off" instead of an orange "no link"
     */
    quiet?: boolean
}

/**
 * "On air · updated N min ago" in a card header: one look for every live source on the
 * observatory dashboard (the weather station, the observatory agent)
 */
export const LiveMeta: React.FC<LiveMetaProps> = ({ online, minutesAgo, quiet }) => {
    const { t } = useTranslation()

    if (minutesAgo === undefined) {
        return null
    }

    // The age in the largest unit that reads well: minutes, then hours, then days
    const { unit, count } = splitAge(minutesAgo)

    const updated = (minutes: number): string =>
        minutes < 1
            ? t('components.pages.observatory.live.updated-now', 'обновлено только что')
            : unit === 'minutes'
              ? t('components.pages.observatory.live.updated-ago', 'обновлено {{count}} мин назад', { count })
              : unit === 'hours'
                ? t('components.pages.observatory.live.updated-hours', 'обновлено {{count}} ч назад', { count })
                : t('components.pages.observatory.live.updated-days', 'обновлено {{count}} дн назад', { count })

    const lastSeen = (minutes: number): string =>
        minutes < 1
            ? t('components.pages.observatory.live.seen-now', 'последняя связь только что')
            : unit === 'minutes'
              ? t('components.pages.observatory.live.seen-minutes', 'последняя связь {{count}} мин назад', { count })
              : unit === 'hours'
                ? t('components.pages.observatory.live.seen-hours', 'последняя связь {{count}} ч назад', { count })
                : t('components.pages.observatory.live.seen-days', 'последняя связь {{count}} дн назад', { count })

    return (
        <span className={styles.liveMeta}>
            <StatusBadge
                tone={online ? 'positive' : quiet ? 'neutral' : 'warning'}
                dot={true}
            >
                {online
                    ? t('components.pages.observatory.live.online', 'На связи')
                    : quiet
                      ? t('components.pages.observatory.live.switched-off', 'Выключена')
                      : t('components.pages.observatory.live.offline', 'Нет связи')}
            </StatusBadge>
            <CardMeta>{online ? updated(minutesAgo) : lastSeen(minutesAgo)}</CardMeta>
        </span>
    )
}
