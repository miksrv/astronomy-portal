import React from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { createPreviewMediaUrl } from '@/utils/eventMedia'

import styles from './styles.module.sass'

interface MainSectionHeroProps {
    // A random sample from the unified photo+video gallery feed - shown as
    // plain decorative thumbnails (each item's poster image), no video-only
    // chrome here since this is just a linked preview grid, not the gallery itself.
    photos?: ApiModel.EventMedia[]
}

export const MainSectionHero: React.FC<MainSectionHeroProps> = ({ photos }) => {
    const { t } = useTranslation()

    return (
        <section className={cn(styles.section, styles.sectionHero)}>
            <div
                className={styles.sectionBg}
                style={{ backgroundImage: 'url(/images/index-hero.png)' }}
            />
            <div className={cn(styles.sectionGrid, styles.sectionHeroGrid)}>
                <div className={cn(styles.sectionText, 'animate')}>
                    <span className={styles.sectionLabel}>
                        {t('components.pages.index.main-sections.label-astrophoto', 'Лучший астрономический проект')}
                    </span>
                    <h1 className={styles.sectionTitle}>
                        {t('components.pages.index.main-sections.hero-title', 'Смотри на звёзды')}
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
                            link={'/stargazing'}
                        />
                        <Button
                            mode={'secondary'}
                            label={t('components.pages.index.main-sections.hero-cta-photos', 'Все астровыезды')}
                            link={'/stargazing/history'}
                        />
                    </div>
                </div>
                <div className={cn(styles.sectionRightCenter, styles.sectionRightCenterVisible, 'animate')}>
                    {photos && photos.length > 0 && (
                        <div className={styles.photoGrid}>
                            {photos.slice(0, 4).map((photo, index) => {
                                const alt = t(
                                    'components.pages.index.main-sections.event-photo-alt',
                                    'Смотри на звёзды. Астровыезды в Оренбурге — фото {{number}}',
                                    {
                                        number: index + 1
                                    }
                                )

                                return (
                                    <Link
                                        key={`${photo.eventId}-${photo.name}`}
                                        href={`/stargazing/${photo.eventId}`}
                                        title={alt}
                                        className={styles.photoThumb}
                                    >
                                        <Image
                                            src={createPreviewMediaUrl(photo)}
                                            alt={alt}
                                            fill={true}
                                            style={{ objectFit: 'cover' }}
                                            // First thumbnail is the likely LCP element on the
                                            // homepage hero — the rest stay lazy.
                                            priority={index === 0}
                                        />
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
