import React from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { StargazingStats } from '@/components/common'

import styles from './styles.module.sass'

export const MainSectionCommunity: React.FC = () => {
    const { t } = useTranslation()

    return (
        <section className={styles.section}>
            <div
                className={styles.sectionBg}
                style={{ backgroundImage: 'url(/images/index-stargazing.png)' }}
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
                            label={t('components.pages.index.main-sections.read-more', 'Подробнее')}
                            link={'/stargazing/howto'}
                        />
                    </div>
                </div>
                <div className={cn(styles.sectionRight, 'animate')}>
                    <StargazingStats />
                </div>
            </div>
        </section>
    )
}
