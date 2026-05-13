import React from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { createMediumPhotoUrl, createPhotoTitle } from '@/utils/photos'

import styles from './styles.module.sass'

interface MainSectionAstrophotosProps {
    photos?: ApiModel.Photo[]
}

export const MainSectionAstrophotos: React.FC<MainSectionAstrophotosProps> = ({ photos }) => {
    const { t } = useTranslation()

    return (
        <section className={cn(styles.section, styles.sectionHero)}>
            <div
                className={styles.sectionBg}
                style={{ backgroundImage: 'url(/images/astrophoto.jpeg)' }}
            />
            <div className={cn(styles.sectionGrid, styles.sectionHeroGrid)}>
                <div className={cn(styles.sectionText, 'animate')}>
                    <span className={styles.sectionLabel}>
                        {t('components.pages.index.main-sections.label-astrophoto', 'Лучший астрономический проект')}
                    </span>
                    <h1 className={styles.sectionTitle}>
                        {t('components.pages.index.main-sections.hero-title', 'СМОТРИ НА ЗВЁЗДЫ')}
                    </h1>
                    <p className={styles.sectionDesc}>
                        {t(
                            'components.pages.index.main-sections.hero-description',
                            'Астрономический проект в Оренбуржье — выезды под звёздное небо, собственная обсерватория и архив астрофотографий.'
                        )}
                    </p>
                    <div className={styles.heroCta}>
                        <Button
                            mode={'primary'}
                            label={t('components.pages.index.main-sections.hero-cta-stargazing', 'Записаться на выезд')}
                            link={'/stargazing/tickets'}
                        />
                        <Button
                            mode={'secondary'}
                            label={t('components.pages.index.main-sections.hero-cta-photos', 'Смотреть фотографии')}
                            link={'/photos'}
                        />
                    </div>
                </div>
                <div className={cn(styles.sectionRightCenter, 'animate')}>
                    {photos && photos.length > 0 && (
                        <div className={styles.photoCol}>
                            {photos.map((photo) => (
                                <Link
                                    key={photo.id}
                                    href={`/photos/${photo.id}`}
                                    title={createPhotoTitle(photo, t)}
                                    className={styles.photoThumb}
                                >
                                    <Image
                                        src={createMediumPhotoUrl(photo)}
                                        alt={createPhotoTitle(photo, t)}
                                        fill={true}
                                        style={{ objectFit: 'cover' }}
                                    />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
