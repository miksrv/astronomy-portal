import React from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { getTimeFromSec } from '@/utils/helpers'
import { createMediumPhotoUrl, createPhotoTitle } from '@/utils/photos'

import styles from './styles.module.sass'

interface PhotoGridProps {
    photosList?: ApiModel.Photo[]
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({ photosList }) => {
    const { t } = useTranslation()

    return (
        <div className={styles.photoGrid}>
            {photosList && !photosList.length && (
                <div className={'notFoundContainer'}>
                    {t('components.pages.photos.photo-grid.no-results', 'По вашему запросу ничего не найдено')}
                </div>
            )}

            {photosList?.map((photo) => (
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
                    />
                    <div className={styles.description}>
                        <h4>{createPhotoTitle(photo, t)}</h4>
                        <div className={styles.info}>
                            <div>
                                {t('components.pages.photos.photo-grid.exposure', 'Выдержка')}:{' '}
                                {getTimeFromSec(photo?.statistic?.exposure || 0, true)}
                            </div>
                            <div>
                                {t('components.pages.photos.photo-grid.frames', 'Кадров')}:{' '}
                                {photo?.statistic?.frames || 0}
                            </div>
                            <div>
                                {t('components.pages.photos.photo-grid.views', 'Просмотров')}: {photo?.views || 0}
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    )
}
