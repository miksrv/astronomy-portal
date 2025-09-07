import React from 'react'
import { cn } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next'

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
                className={styles.background}
                style={{ backgroundImage: 'url(/photos/observatory-1.jpeg)' }}
            />
            <div className={cn(styles.centralContainer, 'animate animate-slide-up')}>
                <div className={styles.item}>
                    <Counter
                        end={FRAMES}
                        className={styles.counter}
                    />
                    <div>{t('components.pages.index.main-sections.frames', 'Кадров')}</div>
                </div>
                <div className={styles.item}>
                    <Counter
                        end={EXPOSURE}
                        className={styles.counter}
                    />
                    <div>{t('components.pages.index.main-sections.exposure', 'Общая выдержка')}</div>
                </div>
                <div className={styles.item}>
                    <Counter
                        end={OBJECTS}
                        className={styles.counter}
                    />
                    <div>{t('components.pages.index.main-sections.object-count', 'Объектов')}</div>
                </div>
            </div>

            <div className={styles.bottomContainer}>
                <h2 className={'animate'}>{t('components.pages.index.main-sections.observatory', 'Обсерватория')}</h2>
                <p className={'animate'}>
                    {t(
                        'components.pages.index.main-sections.observatory-description',
                        'Откройте для себя вселенную с нашего стационарного наблюдательного пункта, оборудованного передовыми телескопами.'
                    )}
                </p>
                <Link
                    href={'/observatory'}
                    title={t('components.pages.index.main-sections.observatory', 'Обсерватория')}
                    className={'animate'}
                >
                    {t('components.pages.index.main-sections.read-more', 'Подробнее')}
                </Link>
            </div>
        </section>
    )
}
