import React from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { getTimeFromSec } from '@/utils/helpers'
import { createMediumPhotoUrl, createPhotoTitle } from '@/utils/photos'

import styles from './styles.module.sass'

// Cards that can land on the first screen (a full row on desktop) load eagerly
const EAGER_PHOTOS_COUNT = 4

interface PhotoGridProps {
    photosList?: ApiModel.Photo[]
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({ photosList }) => {
    const { t } = useTranslation()

    return (
        <div className={styles.photoGrid}>
            {photosList && !photosList.length && (
                <div className={styles.empty}>
                    {t('components.pages.photos.photo-grid.no-results', 'По вашему запросу ничего не найдено')}
                </div>
            )}

            {photosList?.map((photo, index) => (
                <Link
                    key={photo.id}
                    href={`/photos/${photo.id}`}
                    title={createPhotoTitle(photo, t)}
                    className={styles.photoItem}
                >
                    <Image
                        className={styles.image}
                        src={createMediumPhotoUrl(photo)}
                        alt={createPhotoTitle(photo, t)}
                        fill={true}
                        sizes={'(max-width: 768px) 100vw, 280px'}
                        // The first card is the LCP element, so it's also preloaded from <head>
                        {...(index === 0
                            ? { preload: true }
                            : { loading: index < EAGER_PHOTOS_COUNT ? 'eager' : 'lazy' })}
                    />
                    <div className={styles.description}>
                        <h3 className={styles.title}>{createPhotoTitle(photo, t)}</h3>
                        <div className={styles.info}>
                            <span>
                                {t('components.pages.photos.photo-grid.exposure', 'Выдержка')}:{' '}
                                {getTimeFromSec(photo?.statistic?.exposure || 0, true)}
                            </span>
                            <span>
                                {t('components.pages.photos.photo-grid.frames', 'Кадров')}:{' '}
                                {photo?.statistic?.frames || 0}
                            </span>
                            <span>
                                {t('components.pages.photos.photo-grid.views', 'Просмотров')}: {photo?.views || 0}
                            </span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    )
}
