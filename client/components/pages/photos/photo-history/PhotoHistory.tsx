import React from 'react'
import { Button } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { FilterSpectrum } from '@/components/common/filter-spectrum'
import { StatusBadge } from '@/components/ui'
import { formatCalendarDate, formatExposure } from '@/utils/dates'

import { PhotoVersion } from '../types'

import styles from './styles.module.sass'

interface PhotoHistoryProps {
    /** Every processing of the object, this one included, the newest first */
    versions: PhotoVersion[]
    currentId: string
    /** The version on the before/after slider now */
    compareId?: string
    onCompare: (id: string) => void
    /** For the alt texts: "M 45" */
    name: string
}

/**
 * Every time the observatory came back to the object, the newest first: when, how much light
 * was collected and in which filters - the bar's length is the exposure against the longest
 * one. Any of them can be put on the before/after slider next to this photo.
 */
export const PhotoHistory: React.FC<PhotoHistoryProps> = ({ versions, currentId, compareId, onCompare, name }) => {
    const { t, i18n } = useTranslation()

    const longest = Math.max(...versions.map(({ exposure }) => exposure ?? 0), 1)
    const newest = versions[0]
    const oldest = versions[versions.length - 1]
    const grew =
        newest &&
        oldest &&
        newest !== oldest &&
        (oldest.exposure ?? 0) > 0 &&
        (newest.exposure ?? 0) > (oldest.exposure ?? 0)

    return (
        <div className={styles.photoHistory}>
            {grew && (
                <p className={styles.summary}>
                    {t(
                        'components.pages.photos.photo-history.summary',
                        'С {{year}} года выдержка выросла с {{from}} до {{to}}',
                        {
                            year: oldest.date?.slice(0, 4),
                            from: formatExposure(oldest.exposure, t),
                            to: formatExposure(newest.exposure, t)
                        }
                    )}
                </p>
            )}

            <ol className={styles.list}>
                {versions.map((version) => {
                    const date = formatCalendarDate(version.date, i18n.language)
                    const isCurrent = version.id === currentId
                    const exposure = formatExposure(version.exposure, t)

                    return (
                        <li
                            key={version.id}
                            className={styles.item}
                            aria-current={isCurrent ? 'page' : undefined}
                        >
                            <Link
                                href={`/photos/${version.id}`}
                                className={styles.thumb}
                                tabIndex={-1}
                                aria-hidden={'true'}
                            >
                                <Image
                                    src={version.src}
                                    alt={''}
                                    fill={true}
                                    sizes={'120px'}
                                    loading={'lazy'}
                                />
                            </Link>

                            <div className={styles.meta}>
                                <div className={styles.heading}>
                                    {isCurrent ? (
                                        <span className={styles.date}>{date}</span>
                                    ) : (
                                        <Link
                                            href={`/photos/${version.id}`}
                                            className={styles.date}
                                            title={t(
                                                'components.pages.photos.photo-history.open',
                                                'Снимок {{name}} от {{date}}',
                                                {
                                                    name,
                                                    date
                                                }
                                            )}
                                        >
                                            {date}
                                        </Link>
                                    )}
                                    {isCurrent && (
                                        <StatusBadge tone={'accent'}>
                                            {t('components.pages.photos.photo-history.current', 'этот снимок')}
                                        </StatusBadge>
                                    )}
                                </div>
                                <p className={styles.stats}>
                                    {exposure ||
                                        t('components.pages.photos.photo-history.no-exposure', 'выдержка не указана')}
                                    {!!version.frames &&
                                        ` · ${t('common.frames', '{{count}} кадров', { count: version.frames })}`}
                                </p>
                                {!!version.exposure && (
                                    <div
                                        className={styles.bar}
                                        style={{ width: `${Math.max(((version.exposure ?? 0) / longest) * 100, 4)}%` }}
                                    >
                                        <FilterSpectrum filters={version.filters} />
                                    </div>
                                )}
                            </div>

                            {!isCurrent && (
                                <Button
                                    mode={compareId === version.id ? 'primary' : 'secondary'}
                                    size={'small'}
                                    icon={'Layers'}
                                    aria-pressed={compareId === version.id}
                                    label={t('components.pages.photos.photo-history.compare', 'Сравнить')}
                                    aria-label={t(
                                        'components.pages.photos.photo-history.compare-label',
                                        'Сравнить этот снимок со снимком от {{date}}',
                                        { date }
                                    )}
                                    onClick={() => onCompare(version.id)}
                                />
                            )}
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}
