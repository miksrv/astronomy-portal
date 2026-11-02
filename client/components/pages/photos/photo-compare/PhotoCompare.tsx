import React, { useCallback, useRef, useState } from 'react'

import Image from 'next/image'
import { useTranslation } from 'next-i18next/pages'

import { formatCalendarDate } from '@/utils/dates'

import { PhotoVersion } from '../types'

import styles from './styles.module.sass'

interface PhotoCompareProps {
    /** The photo of the page: the right side */
    current: PhotoVersion
    /** The version it is compared with: the left side */
    other: PhotoVersion
    /** For the alt texts */
    title: string
}

/** How far one arrow key press moves the divider, percent */
const KEY_STEP = 5

/**
 * Two processings of one object in the same frame, a divider between them to drag: the left
 * side shows the other version, the right one this photo. The versions may be framed
 * differently; both are fitted into the frame of this photo.
 */
export const PhotoCompare: React.FC<PhotoCompareProps> = ({ current, other, title }) => {
    const { t, i18n } = useTranslation()
    const ref = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState(50)

    const moveTo = useCallback((clientX: number) => {
        const rect = ref.current?.getBoundingClientRect()

        if (rect?.width) {
            setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)))
        }
    }, [])

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        moveTo(event.clientX)
    }

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            moveTo(event.clientX)
        }
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const next =
            event.key === 'ArrowLeft'
                ? position - KEY_STEP
                : event.key === 'ArrowRight'
                  ? position + KEY_STEP
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? 100
                      : undefined

        if (next !== undefined) {
            event.preventDefault()
            setPosition(Math.min(100, Math.max(0, next)))
        }
    }

    const currentDate = formatCalendarDate(current.date, i18n.language)
    const otherDate = formatCalendarDate(other.date, i18n.language)

    return (
        <div
            ref={ref}
            className={styles.photoCompare}
            style={{ '--divider': `${position}%` } as React.CSSProperties}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
        >
            <Image
                className={styles.image}
                src={current.large}
                alt={t('components.pages.photos.photo-compare.alt', 'Снимок {{title}} от {{date}}', {
                    title,
                    date: currentDate
                })}
                fill={true}
                sizes={'(max-width: 768px) 100vw, 1200px'}
                draggable={false}
            />
            <div className={styles.other}>
                <Image
                    className={styles.image}
                    src={other.large}
                    alt={t('components.pages.photos.photo-compare.alt', 'Снимок {{title}} от {{date}}', {
                        title,
                        date: otherDate
                    })}
                    fill={true}
                    sizes={'(max-width: 768px) 100vw, 1200px'}
                    draggable={false}
                    style={{ backgroundImage: `url(${other.src})` }}
                />
            </div>

            <span className={styles.labelLeft}>{otherDate}</span>
            <span className={styles.labelRight}>
                {currentDate}
                <small>{t('components.pages.photos.photo-compare.this', 'этот')}</small>
            </span>

            <div
                className={styles.divider}
                role={'slider'}
                tabIndex={0}
                aria-label={t(
                    'components.pages.photos.photo-compare.divider',
                    'Граница между снимками от {{other}} и {{current}}',
                    { other: otherDate, current: currentDate }
                )}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(position)}
                onKeyDown={handleKeyDown}
            >
                <span
                    className={styles.handle}
                    aria-hidden={'true'}
                />
            </div>
        </div>
    )
}
