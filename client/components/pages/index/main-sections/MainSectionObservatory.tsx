import React from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { Counter } from '@/components/ui'

import styles from './styles.module.sass'

const FRAMES = 6870
const EXPOSURE = 585
const OBJECTS = 93

export const MainSectionObservatory: React.FC = () => {
    const { t } = useTranslation()

    return (
        <section className={styles.section}>
            <div
                className={styles.sectionBg}
                style={{ backgroundImage: 'url(/photos/observatory-1.jpeg)' }}
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
                    <Button
                        mode={'primary'}
                        label={t('components.pages.index.main-sections.observatory-button', 'Мониторинг обсерватории')}
                        link={'/observatory'}
                    />
                </div>
                <div className={cn(styles.sectionRight, 'animate')}>
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
                </div>
            </div>
        </section>
    )
}
