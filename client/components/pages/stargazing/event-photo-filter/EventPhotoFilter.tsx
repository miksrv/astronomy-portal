import React, { useMemo } from 'react'
import { cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'

import styles from './styles.module.sass'

export interface EventPhotoFilterProps {
    photos?: ApiModel.EventPhoto[]
    selected?: string
    onChange: (photographer?: string) => void
}

/**
 * Chip-style filter for the event gallery, letting visitors narrow the photo
 * grid down to a single photographer's shots. Purely client-side - the
 * unique photographer list is derived from the photos already fetched for
 * the event, there is no dedicated "list of photographers" endpoint.
 * Renders nothing when there are fewer than two distinct photographers,
 * since there would be nothing meaningful to filter.
 */
export const EventPhotoFilter: React.FC<EventPhotoFilterProps> = ({ photos, selected, onChange }) => {
    const { t } = useTranslation()

    const photographers = useMemo(() => {
        const names = new Set<string>()

        photos?.forEach((photo) => {
            if (photo.photographer) {
                names.add(photo.photographer)
            }
        })

        return Array.from(names).sort((a, b) => a.localeCompare(b, 'ru'))
    }, [photos])

    if (photographers.length < 2) {
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
