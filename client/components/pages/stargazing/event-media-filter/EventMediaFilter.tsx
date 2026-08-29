import React from 'react'
import { cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

export interface EventMediaFilterProps {
    /**
     * Distinct photographer credits for the event, independent of which page
     * of the (server-paginated) gallery happens to be loaded — the
     * `photographers` field `GET /events/media` returns alongside the items,
     * which the backend builds from the event's whole gallery rather than
     * from the media items currently on screen.
     */
    photographers?: string[]
    selected?: string
    onChange: (photographer?: string) => void
}

/**
 * Chip-style filter for the event gallery, letting visitors narrow the
 * photo/video grid down to a single photographer's/videographer's
 * contributions. Renders nothing when there are fewer than two distinct
 * photographer credits, since there would be nothing meaningful to filter.
 */
export const EventMediaFilter: React.FC<EventMediaFilterProps> = ({ photographers, selected, onChange }) => {
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
                    {t('components.pages.stargazing.event-media-filter.all', 'Все')}
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
