import React, { useEffect, useRef } from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { createMediumPhotoUrl } from '@/utils/photos'
import { formatObjectName } from '@/utils/strings'

import styles from './styles.module.sass'

/** Matches the desktop breakpoint of the star map styles (MOBILE_MAX_WIDTH = 768) */
const DESKTOP_MEDIA_QUERY = '(min-width: 769px)'

interface StarMapIntroProps {
    /** The page's H1 — passed in so the page <title> and the heading never diverge */
    title: string
    /** Hide the card together with the map's other overlays (hide-UI / screenshot mode) */
    hidden?: boolean
}

/**
 * Crawlable intro of the star map page (FE-7 of features/star-atlas-upgrade.md), a
 * collapsed <details> so the map keeps the whole viewport: only the H1 is visible until
 * the visitor expands it. The copy stays in the server-rendered DOM — a legitimate,
 * fully-indexed pattern (unlike display:none-style hidden text, which search engines
 * treat as cloaking). On desktop it floats over the map's top-right corner as a glass
 * card (FAQ-style accordion); on mobile it is a bar under the map — one element, one H1,
 * see pages/starmap.module.sass.
 */
const StarMapIntro: React.FC<StarMapIntroProps> = ({ title, hidden }) => {
    const { t } = useTranslation()

    const { data } = API.usePhotosGetListQuery({ limit: 1, order: 'rand' })

    const photo = data?.items?.[0]
    const objectName = photo?.objects?.[0]

    const detailsRef = useRef<HTMLDetailsElement>(null)

    // Desktop card closes like a popover: Escape, or a click/tap anywhere outside it.
    // Not on mobile — there the expanded copy is below the map in the page flow and a tap
    // on the map while reading should not fold it away.
    useEffect(() => {
        const details = detailsRef.current

        if (!details) {
            return
        }

        const isDesktop = () => window.matchMedia(DESKTOP_MEDIA_QUERY).matches

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && details.open && isDesktop()) {
                details.open = false
            }
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (details.open && isDesktop() && !details.contains(event.target as Node)) {
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

                {photo && objectName && (
                    <Link
                        href={`/objects/${objectName}`}
                        className={styles.featuredCard}
                        title={formatObjectName(objectName)}
                    >
                        <div className={styles.featuredTitle}>
                            {t('pages.star-map.our-object', 'Наш объект')}
                            {': '}
                            {formatObjectName(objectName)}
                        </div>
                        <div className={styles.featuredImage}>
                            <Image
                                src={createMediumPhotoUrl(photo)}
                                alt={formatObjectName(objectName)}
                                fill={true}
                                sizes={'320px'}
                                style={{ objectFit: 'cover' }}
                            />
                        </div>
                        <span className={styles.featuredLink}>
                            {t('pages.star-map.view-on-portal', 'Смотреть на портале')} →
                        </span>
                    </Link>
                )}
            </div>
        </details>
    )
}

export default StarMapIntro
