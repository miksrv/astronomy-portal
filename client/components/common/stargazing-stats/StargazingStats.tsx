import React from 'react'
import { cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { Counter } from '@/components/ui'
import { STARGAZING_FOUNDING_YEAR, STARGAZING_LEGACY_MEMBERS } from '@/utils/constants'

import styles from './styles.module.sass'

interface StargazingStatsProps {
    /** A row of numbers on a hairline, left-aligned: the landing hero's band */
    strip?: boolean
    className?: string
}

export const StargazingStats: React.FC<StargazingStatsProps> = ({ strip, className }) => {
    const { t } = useTranslation()

    const { data } = API.useStatisticGetStargazingQuery()

    // Registered participants plus the legacy offset, so both pages share one source
    const members = (data?.members ?? 0) + STARGAZING_LEGACY_MEMBERS
    const years = Math.max(1, new Date().getFullYear() - STARGAZING_FOUNDING_YEAR)

    const items = [
        {
            id: 'members',
            value: members,
            label: t('components.pages.index.main-sections.stargazing-members', 'Участников')
        },
        {
            id: 'events',
            value: data?.events ?? 0,
            label: t('components.pages.index.main-sections.stargazing-count', 'Астровыездов')
        },
        {
            id: 'years',
            value: years,
            label: t('components.pages.index.main-sections.years', 'лет в астрономии')
        }
    ]

    return (
        <div className={cn(strip ? styles.statsStrip : styles.statsRow, className)}>
            {items.map((item) => (
                <div
                    key={item.id}
                    className={styles.statItem}
                >
                    <Counter
                        end={item.value}
                        className={styles.statValue}
                    />
                    <span className={styles.statLabel}>{item.label}</span>
                </div>
            ))}
        </div>
    )
}
