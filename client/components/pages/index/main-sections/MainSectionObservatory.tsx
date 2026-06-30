import React from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { Counter } from '@/components/ui'
import { createMediumPhotoUrl, createPhotoTitle } from '@/utils/photos'

import styles from './styles.module.sass'

const FRAMES = 6870
const EXPOSURE = 585
const OBJECTS = 93

interface MainSectionObservatoryProps {
    photos?: ApiModel.Photo[]
}

export const MainSectionObservatory: React.FC<MainSectionObservatoryProps> = ({ photos }) => {
    const { t } = useTranslation()

    return (
        <section className={styles.section}>
            <div
                className={styles.sectionBg}
                style={{ backgroundImage: 'url(/images/index-observatory.png)' }}
            />
            <div className={styles.sectionGrid}>
                <div className={cn(styles.sectionText, 'animate')}>
                    <span className={styles.sectionLabel}>
                        {t('components.pages.index.main-sections.label-observatory', 'ОБСЕРВАТОРИЯ')}
                    </span>
                    <h2 className={styles.sectionTitle}>
                        {t('components.pages.index.main-sections.observatory-title', 'НАШ НАБЛЮДАТЕЛЬНЫЙ ПУНКТ')}
                    </h2>
                    <p className={styles.sectionDesc}>
                        {t(
                            'components.pages.index.main-sections.observatory-description',
                            'Откройте для себя вселенную с нашего стационарного наблюдательного пункта, оборудованного передовыми телескопами.'
                        )}
                    </p>
                    <div className={styles.heroCta}>
                        <Button
                            mode={'primary'}
                            label={t('components.pages.index.main-sections.photos-button', 'Фотографии')}
                            link={'/photos'}
                        />
                        <Button
                            mode={'secondary'}
                            label={t('components.pages.index.main-sections.objects-button', 'Объекты наблюдения')}
                            link={'/objects'}
                        />
                    </div>
                </div>
                <div className={cn(styles.sectionRight, styles.sectionRightColumn, 'animate')}>
                    <div className={styles.statsRow}>
                        <div className={styles.statItem}>
                            <Counter
                                end={FRAMES}
                                className={styles.statValue}
                            />
                            <span className={styles.statLabel}>
                                {t('components.pages.index.main-sections.frames', 'Кадров')}
                            </span>
                        </div>
                        <div className={styles.statItem}>
                            <Counter
                                end={EXPOSURE}
                                className={styles.statValue}
                            />
                            <span className={styles.statLabel}>
                                {t('components.pages.index.main-sections.exposure', 'Часов выдержки')}
                            </span>
                        </div>
                        <div className={styles.statItem}>
                            <Counter
                                end={OBJECTS}
                                className={styles.statValue}
                            />
                            <span className={styles.statLabel}>
                                {t('components.pages.index.main-sections.object-count', 'Объектов')}
                            </span>
                        </div>
                    </div>
                    {photos && photos.length > 0 && (
                        <div className={styles.photoRow}>
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
