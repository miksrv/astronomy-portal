import React from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { Counter } from '@/components/ui'

import styles from './styles.module.sass'

const YEARS = 11
const STARGAZING = 42
const PEOPLES = 54100

export const MainSectionStargazing: React.FC = () => {
    const { t } = useTranslation()

    return (
        <section className={styles.section}>
            <div
                className={styles.sectionBg}
                style={{ backgroundImage: 'url(/photos/stargazing-4.jpeg)' }}
            />
            <div className={styles.sectionGrid}>
                <div className={cn(styles.sectionText, 'animate')}>
                    <span className={styles.sectionLabel}>
                        {t('components.pages.index.main-sections.label-stargazing', 'АСТРОВЫЕЗДЫ')}
                    </span>
                    <h2 className={styles.sectionTitle}>
                        {t('components.pages.index.main-sections.stargazing-title', 'ПОД ОТКРЫТЫМ НЕБОМ')}
                    </h2>
                    <p className={styles.sectionDesc}>
                        {t(
                            'components.pages.index.main-sections.stargazing-description',
                            'Организуем регулярные поездки под открытое небо, чтобы наблюдать за звездами и планетами через мощные телескопы.'
                        )}
                    </p>
                    <div className={styles.heroCta}>
                        <Button
                            mode={'primary'}
                            label={t('components.pages.index.main-sections.buy-ticket', 'Купить билет')}
                            link={'/stargazing/tickets'}
                        />
                        <Button
                            mode={'secondary'}
                            label={t('components.pages.index.main-sections.read-more', 'Подробнее')}
                            link={'/stargazing'}
                        />
                    </div>
                </div>
                <div className={cn(styles.sectionRight, 'animate')}>
                    <div className={styles.statsRow}>
                        <div className={styles.statItem}>
                            <Counter
                                end={PEOPLES}
                                className={styles.statValue}
                            />
                            <span className={styles.statLabel}>
                                {t('components.pages.index.main-sections.stargazing-members', 'Участников')}
                            </span>
                        </div>
                        <div className={styles.statItem}>
                            <Counter
                                end={STARGAZING}
                                className={styles.statValue}
                            />
                            <span className={styles.statLabel}>
                                {t('components.pages.index.main-sections.stargazing-count', 'Астровыездов')}
                            </span>
                        </div>
                        <div className={styles.statItem}>
                            <Counter
                                end={YEARS}
                                className={styles.statValue}
                            />
                            <span className={styles.statLabel}>
                                {t('components.pages.index.main-sections.years', 'лет в астрономии')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
