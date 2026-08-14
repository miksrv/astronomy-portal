import React from 'react'
import { cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

export interface EventPhotoFilterProps {
    /**
     * Distinct photographer credits for the event, independent of which page
     * of the (server-paginated) gallery happens to be loaded — sourced from
     * the dedicated `events/:id/photographers` endpoint, not derived from
     * whatever photos are currently on screen.
     */
    photographers?: string[]
    selected?: string
    onChange: (photographer?: string) => void
}

/**
 * Chip-style filter for the event gallery, letting visitors narrow the photo
 * grid down to a single photographer's shots. Renders nothing when there are
 * fewer than two distinct photographers, since there would be nothing
 * meaningful to filter.
 */
export const EventPhotoFilter: React.FC<EventPhotoFilterProps> = ({ photographers, selected, onChange }) => {
    const { t } = useTranslation()

    if (!photographers || photographers.length < 2) {
        return null
    }

    return (
        <ul className={styles.filterList}>
            <li>
                <button
                    type={'button'}
                    className={cn(styles.filterItem, !selected && styles.active)}
                    onClick={() => onChange(undefined)}
                >
                    {t('components.pages.stargazing.event-photo-filter.all', 'Все')}
                </button>
            </li>
            {photographers.map((name) => (
                <li key={name}>
                    <button
                        type={'button'}
                        className={cn(styles.filterItem, selected === name && styles.active)}
                        onClick={() => onChange(name)}
                    >
                        {name}
                    </button>
                </li>
            ))}
        </ul>
    )
}
