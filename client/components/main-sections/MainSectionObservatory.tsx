import React from 'react'
import { cn } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import Counter from '@/ui/counter'

import styles from './styles.module.sass'

const FRAMES = 6870
const EXPOSURE = 585
const OBJECTS = 93

const MainSectionStargazing: React.FC = () => {
    const { t } = useTranslation()

    return (
        <section className={styles.section}>
            <div
                className={styles.background}
                style={{ backgroundImage: 'url(/photos/observatory-1.jpeg)' }}
            />
            <div className={cn(styles.centralContainer, 'animate animate-slide-up')}>
                <div className={styles.item}>
                    <Counter
                        end={FRAMES}
                        className={styles.counter}
                    />
                    <div>{t('frames')}</div>
                </div>
                <div className={styles.item}>
                    <Counter
                        end={EXPOSURE}
                        className={styles.counter}
                    />
                    <div>{t('exposure')}</div>
                </div>
                <div className={styles.item}>
                    <Counter
                        end={OBJECTS}
                        className={styles.counter}
                    />
                    <div>{t('object-count')}</div>
                </div>
            </div>

            <div className={styles.bottomContainer}>
                <h2 className={'animate'}>{t('observatory')}</h2>
                <p className={'animate'}>{t('observatory-section-description')}</p>
                <Link
                    href={'/observatory'}
                    title={t('observatory')}
                    className={'animate'}
                >
                    {t('read-more')}
                </Link>
            </div>
        </section>
    )
}

export default MainSectionStargazing
