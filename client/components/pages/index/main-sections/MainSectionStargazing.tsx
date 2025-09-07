import React from 'react'
import { cn } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { Counter } from '@/components/ui'

import styles from './styles.module.sass'

const YEARS = 10
const STARGAZING = 42
const PEOPLES = 54100

export const MainSectionStargazing: React.FC = () => {
    const { t } = useTranslation()

    return (
        <section className={styles.section}>
            <div
                className={styles.background}
                style={{ backgroundImage: 'url(/photos/stargazing-4.jpeg)' }}
            />
            <div className={cn(styles.centralContainer, 'animate animate-slide-up')}>
                <div className={styles.item}>
                    <Counter
                        end={YEARS}
                        className={styles.counter}
                    />
                    <div>{t('components.pages.index.main-sections.years', 'лет')}</div>
                </div>
                <div className={styles.item}>
                    <Counter
                        end={STARGAZING}
                        className={styles.counter}
                    />
                    <div>{t('components.pages.index.main-sections.stargazing-count', 'Астровыездов')}</div>
                </div>
                <div className={styles.item}>
                    <Counter
                        end={PEOPLES}
                        className={styles.counter}
                    />
                    <div>{t('components.pages.index.main-sections.stargazing-members', 'Участников')}</div>
                </div>
            </div>

            <div className={styles.bottomContainer}>
                <h2 className={'animate'}>{t('components.pages.index.main-sections.stargazing', 'Астровыезды')}</h2>
                <p className={'animate'}>
                    {t(
                        'components.pages.index.main-sections.stargazing-description',
                        'Организуем регулярные поездки под открытое небо, чтобы наблюдать за звездами и планетами через мощные телескопы.'
                    )}
                </p>
                <Link
                    href={'/stargazing'}
                    title={t('components.pages.index.main-sections.stargazing', 'Астровыезды')}
                    className={'animate'}
                >
                    {t('components.pages.index.main-sections.read-more', 'Подробнее')}
                </Link>
            </div>
        </section>
    )
}
