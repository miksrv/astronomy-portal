import { ApiModel } from '@/api'
import { createMediumPhotoUrl, createPhotoTitle } from '@/tools/photos'
import { useTranslation } from 'next-i18next'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface MainSectionStargazingProps {
    photos?: ApiModel.Photo[]
}

const MainSectionStargazing: React.FC<MainSectionStargazingProps> = ({
    photos
}) => {
    const { t } = useTranslation()

    return (
        <section className={styles.section}>
            <div
                className={styles.background}
                style={{
                    backgroundImage: 'url(/images/astrophoto.jpeg)'
                }}
            />
            <div
                className={cn(
                    styles.centralContainer,
                    styles.photosContainer,
                    'animate animate-slide-up'
                )}
            >
                {photos?.map((photo) => (
                    <Link
                        key={photo.id}
                        href={`/photos/${photo.id}`}
                        title={createPhotoTitle(photo, t)}
                        className={styles.photoItem}
                    >
                        <Image
                            src={createMediumPhotoUrl(photo)}
                            alt={photo.id}
                            fill={true}
                        />
                    </Link>
                ))}
            </div>

            <div className={styles.bottomContainer}>
                <h2 className={'animate'}>{t('astrophoto')}</h2>
                <p className={'animate'}>
                    {t('astrophoto-section-description')}
                </p>
                <Link
                    href={'/photos'}
                    title={t('astrophoto')}
                    className={'animate'}
                >
                    {t('read-more')}
                </Link>
            </div>
        </section>
    )
}

export default MainSectionStargazing
