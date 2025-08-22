import React from 'react'
import { cn } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { ApiModel } from '@/api'
import { createMediumPhotoUrl, createPhotoTitle } from '@/utils/photos'

import styles from './styles.module.sass'

interface MainSectionAstrophotosProps {
    photos?: ApiModel.Photo[]
}

export const MainSectionAstrophotos: React.FC<MainSectionAstrophotosProps> = ({ photos }) => {
    const { t } = useTranslation()

    return (
        <section className={styles.section}>
            <div
                className={styles.background}
                style={{
                    backgroundImage: 'url(/images/astrophoto.jpeg)'
                }}
            />
            <div className={cn(styles.centralContainer, styles.photosContainer, 'animate animate-slide-up')}>
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
                <h2 className={'animate'}>
                    {t('components.pages.index.main-sections.astrophoto', { defaultValue: 'Астрофото' })}
                </h2>
                <p className={'animate'}>
                    {t('components.pages.index.main-sections.astrophoto-description', {
                        defaultValue:
                            'Коллекция снимков космоса, сделанных на нашей обсерватории, раскрывающая красоту далеких галактик, туманностей и звездных скоплений.'
                    })}
                </p>
                <Link
                    href={'/photos'}
                    title={t('components.pages.index.main-sections.astrophoto', { defaultValue: 'Астрофото' })}
                    className={'animate'}
                >
                    {t('components.pages.index.main-sections.read-more', { defaultValue: 'Подробнее' })}
                </Link>
            </div>
        </section>
    )
}
