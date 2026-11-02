import React from 'react'
import { cn } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { formatCalendarDate } from '@/utils/dates'

import { ObjectPagePhoto } from '../types'

import styles from './styles.module.sass'

interface ObjectPhotosProps {
    /** The newest first */
    photos: ObjectPagePhoto[]
    name: string
    /** The photo being viewed, outlined in the grid (the photo page); the newest otherwise */
    currentId?: string
}

/** Every processed photo of the object as tiles, the newest marked; each opens its photo page */
export const ObjectPhotos: React.FC<ObjectPhotosProps> = ({ photos, name, currentId }) => {
    const { t, i18n } = useTranslation()

    return (
        <ul className={styles.objectPhotos}>
            {photos.map((photo, i) => {
                const date = formatCalendarDate(photo.date, i18n.language)

                return (
                    <li key={photo.id}>
                        <Link
                            href={`/photos/${photo.id}`}
                            className={cn(styles.tile, (currentId ? photo.id === currentId : i === 0) && styles.latest)}
                            aria-current={currentId === photo.id ? 'page' : undefined}
                            title={t('components.pages.objects.object-photos.open', 'Открыть снимок от {{date}}', {
                                date
                            })}
                        >
                            <Image
                                src={photo.src}
                                alt={t('components.pages.objects.object-photos.alt', 'Фото {{name}} от {{date}}', {
                                    name,
                                    date
                                })}
                                fill={true}
                                sizes={'(max-width: 768px) 50vw, 280px'}
                            />
                            <span className={styles.pill}>
                                {date}
                                {i === 0 && ` · ${t('components.pages.objects.object-photos.latest', 'последний')}`}
                            </span>
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}
