import Counter from '@/ui/counter'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import React from 'react'
import { cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

const YEARS = 10
const STARGAZING = 42
const PEOPLES = 54100

const MainSectionStargazing: React.FC = () => {
    const { t } = useTranslation()

    return (
        <section className={styles.section}>
            <div
                className={styles.background}
                style={{ backgroundImage: 'url(/photos/stargazing-4.jpeg)' }}
            />
            <div
                className={cn(
                    styles.centralContainer,
                    'animate animate-slide-up'
                )}
            >
                <div className={styles.item}>
                    <Counter
                        end={YEARS}
                        className={styles.counter}
                    />
                    <div>{t('years')}</div>
                </div>
                <div className={styles.item}>
                    <Counter
                        end={STARGAZING}
                        className={styles.counter}
                    />
                    <div>{t('stargazings')}</div>
                </div>
                <div className={styles.item}>
                    <Counter
                        end={PEOPLES}
                        className={styles.counter}
                    />
                    <div>{t('peoples')}</div>
                </div>
            </div>

            <div className={styles.bottomContainer}>
                <h2 className={'animate'}>{t('stargazings')}</h2>
                <p className={'animate'}>
                    {t('stargazings-section-description')}
                </p>
                <Link
                    href={'/stargazing'}
                    title={t('stargazing')}
                    className={'animate'}
                >
                    {t('read-more')}
                </Link>
            </div>
        </section>
    )
}

export default MainSectionStargazing
