import React from 'react'
import { cn } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { Carousel } from '@/components/ui'
import { formatCalendarDate } from '@/utils/dates'

import styles from './styles.module.sass'

export interface StripPhoto {
    id: string
    /** `YYYY-MM-DD` */
    date?: string
    /** Medium-size image URL */
    src: string
    /** A caption instead of the date: the object's name on a "see also" strip */
    label?: string
}

interface PhotoStripProps {
    photos: StripPhoto[]
    /** The photo being viewed, outlined in the strip */
    currentId?: string
    /** For the tiles' alt text */
    name: string
}

/** A row of photos to flick through, the way a gallery shows the neighbours of a work */
export const PhotoStrip: React.FC<PhotoStripProps> = ({ photos, currentId, name }) => {
    const { t, i18n } = useTranslation()

    return (
        <Carousel
            className={styles.photoStrip}
            options={{ align: 'start', dragFree: true, containScroll: 'trimSnaps' }}
        >
            {photos.map((photo) => {
                const date = formatCalendarDate(photo.date, i18n.language)
                const current = photo.id === currentId

                return (
                    // The carousel sizes its slides by `> div`; the link inside is the tile
                    <div key={photo.id}>
                        <Link
                            href={`/photos/${photo.id}`}
                            className={cn(styles.slide, current && styles.current)}
                            aria-current={current ? 'page' : undefined}
                            title={
                                photo.label ??
                                t('components.pages.photos.photo-strip.open', 'Снимок от {{date}}', { date })
                            }
                        >
                            <Image
                                src={photo.src}
                                alt={t('components.pages.photos.photo-strip.alt', 'Фото {{name}} от {{date}}', {
                                    name: photo.label ?? name,
                                    date
                                })}
                                fill={true}
                                sizes={'220px'}
                                loading={'lazy'}
                            />
                            <span className={styles.caption}>
                                {photo.label ?? date}
                                {current && (
                                    <small>{t('components.pages.photos.photo-strip.current', 'вы здесь')}</small>
                                )}
                            </span>
                        </Link>
                    </div>
                )
            })}
        </Carousel>
    )
}
