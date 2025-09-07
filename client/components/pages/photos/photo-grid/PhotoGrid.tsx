import React from 'react'
import { Container } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'

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
        <Container className={styles.photoGrid}>
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
                        </div>
                    </div>
                </Link>
            ))}
        </Container>
    )
}
