import { ApiModel } from '@/api'
import { getTimeFromSec } from '@/functions/helpers'
import { createMediumPhotoUrl, createPhotoTitle } from '@/tools/photos'
import { useTranslation } from 'next-i18next'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Container } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface PhotoGridProps {
    photosList?: ApiModel.Photo[]
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ photosList }) => {
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
                                {t('exposure')}:{' '}
                                {getTimeFromSec(
                                    photo?.statistic?.exposure || 0,
                                    true
                                )}
                            </div>
                            <div>
                                {t('frames')}: {photo?.statistic?.frames || 0}
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </Container>
    )
}

export default PhotoGrid
