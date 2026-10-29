import React, { useEffect, useRef } from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

interface StarMapIntroProps {
    /** The page's H1 — passed in so the page <title> and the heading never diverge */
    title: string
    /** Hide the card together with the map's other overlays (hide-UI / screenshot mode) */
    hidden?: boolean
}

/**
 * Crawlable intro of the star map page (FE-7 of features/star-atlas-upgrade.md), a
 * collapsed <details> so the map keeps the whole viewport: only the H1 is visible until
 * the visitor expands it. A glass card floating over the map's top-right corner, opening
 * downwards like a FAQ block. Desktop only — on a phone the map needs every pixel, so the
 * card is hidden by CSS (the markup, H1 included, stays server-rendered either way).
 */
const StarMapIntro: React.FC<StarMapIntroProps> = ({ title, hidden }) => {
    const { t } = useTranslation()

    const detailsRef = useRef<HTMLDetailsElement>(null)

    // The card closes like a popover: Escape, or a click/tap anywhere outside it
    useEffect(() => {
        const details = detailsRef.current

        if (!details) {
            return
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && details.open) {
                details.open = false
            }
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (details.open && !details.contains(event.target as Node)) {
                details.open = false
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('pointerdown', handlePointerDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('pointerdown', handlePointerDown)
        }
    }, [])

    return (
        <details
            ref={detailsRef}
            className={cn(styles.intro, hidden && styles.introHidden)}
        >
            <summary
                className={styles.introSummary}
                title={t('pages.star-map.about-map', 'Подробнее о карте')}
            >
                <h1>{title}</h1>
                <span className={styles.introHint}>
                    <span>{t('pages.star-map.about-map', 'Подробнее о карте')}</span>
                    <Icon
                        name={'KeyboardDown'}
                        className={styles.chevron}
                    />
                </span>
            </summary>

            <div className={styles.introContent}>
                <div className={styles.introText}>
                    <p>
                        {t(
                            'pages.star-map.intro-tool',
                            'Интерактивный атлас звёздного неба, бесплатный и работающий прямо в браузере: звёзды до шестой звёздной величины, созвездия с линиями и границами, планеты Солнечной системы, Луна и Солнце, а также объекты глубокого космоса — галактики, туманности и звёздные скопления.'
                        )}
                    </p>
                    <p>
                        {t(
                            'pages.star-map.intro-features',
                            'Настраивайте слои карты — координатную сетку, эклиптику, Млечный Путь, названия созвездий — а по отмеченным на карте объектам кликайте, чтобы открыть их астрофотографии, снятые нашей любительской обсерваторией.'
                        )}
                    </p>
                </div>
            </div>
        </details>
    )
}

export default StarMapIntro
