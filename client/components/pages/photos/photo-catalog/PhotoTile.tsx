import React, { memo } from 'react'
import { Icon } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { FilterSpectrum } from '@/components/common/filter-spectrum'
import { formatCalendarDate, formatExposure } from '@/utils/dates'
import { formatObjectName } from '@/utils/strings'

import { GalleryPhotoItem } from './types'

import styles from './styles.module.sass'

interface PhotoTileProps {
    photo: GalleryPhotoItem
    /** The first tile is the LCP candidate: preloaded; the first row loads eagerly */
    priority?: 'preload' | 'eager' | 'lazy'
}

/**
 * One photo of the gallery: the picture, and over its lower edge the object's name, the date
 * and the figures that tell the shots apart (exposure, frames, views), always visible - a
 * touch screen has no hover.
 */
const PhotoTileComponent: React.FC<PhotoTileProps> = ({ photo, priority = 'lazy' }) => {
    const { t, i18n } = useTranslation()

    const name = photo.objects.map(formatObjectName).join(', ')
    const title = photo.titles.join(', ')
    const date = formatCalendarDate(photo.date, i18n.language)

    return (
        <Link
            href={`/photos/${photo.id}`}
            className={styles.tile}
            title={t('components.pages.photos.photo-catalog.open', 'Снимок {{name}} от {{date}}', { name, date })}
        >
            <Image
                className={styles.image}
                src={photo.src}
                alt={t('components.pages.photos.photo-catalog.alt', 'Астрофото {{title}} от {{date}}', {
                    title: title || name,
                    date
                })}
                fill={true}
                sizes={'(max-width: 768px) 100vw, 280px'}
                {...(priority === 'preload' ? { preload: true } : { loading: priority })}
            />
            <div className={styles.caption}>
                <span className={styles.name}>
                    <b>{name}</b>
                    <small>{date}</small>
                </span>
                <span className={styles.figures}>
                    {!!photo.exposure && <span>{formatExposure(photo.exposure, t)}</span>}
                    {!!photo.frames && <span>{t('common.frames', '{{count}} кадров', { count: photo.frames })}</span>}
                    <span className={styles.views}>
                        <Icon name={'Eye'} />
                        {photo.views.toLocaleString(i18n.language)}
                    </span>
                </span>
                {!!photo.exposure && (
                    <FilterSpectrum
                        className={styles.spectrum}
                        filters={photo.filters}
                    />
                )}
            </div>
        </Link>
    )
}

// Filtering re-renders the grid; a tile whose photo and position didn't change is skipped
export const PhotoTile = memo(PhotoTileComponent)
