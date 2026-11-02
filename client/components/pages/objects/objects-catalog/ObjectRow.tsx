import React from 'react'
import { cn, Icon, Skeleton } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { FilterSpectrum } from '@/components/common/filter-spectrum'
import { formatCalendarDate, formatExposure } from '@/utils/dates'
import { getObjectStatus } from '@/utils/objects'
import { fallbackToMediumPhoto } from '@/utils/photos'
import { formatObjectName } from '@/utils/strings'
import { formatObservatoryTime, risesTonight, Visibility } from '@/utils/visibility'

import { ObjectStatusBadge } from '../object-status-badge'

import { CatalogObject } from './types'

import styles from './styles.module.sass'

interface ObjectRowProps {
    object: CatalogObject
    /** Category titles of the object, for the line under its name when it has no title */
    categoryTitles?: string
    /** `null` for an object that moves across the sky, `undefined` while not computed yet */
    visibility?: Visibility | null
    computed: boolean
}

export const ObjectRow: React.FC<ObjectRowProps> = ({ object, categoryTitles, visibility, computed }) => {
    const { t, i18n } = useTranslation()

    const status = getObjectStatus(object)
    const name = formatObjectName(object.name)
    const exposure = formatExposure(object.exposure, t)

    // Shown only once computed, when every object has an entry: no visibility then means a moving object
    const visibilityLabel =
        visibility == null
            ? t('components.pages.objects.objects-catalog.moving', 'Движется по небу')
            : !risesTonight(visibility)
              ? t('components.pages.objects.objects-catalog.does-not-rise', 'Не поднимается')
              : t('components.pages.objects.objects-catalog.altitude-at', '{{altitude}}° в {{time}}', {
                    altitude: Math.round(visibility.altitude),
                    time: formatObservatoryTime(visibility.time, i18n.language)
                })

    const visibilityCell = computed ? (
        <span className={cn(styles.visibility, styles[visibility?.level ?? 'none'])}>
            <span
                className={styles.dot}
                aria-hidden={'true'}
            />
            {visibilityLabel}
        </span>
    ) : (
        <Skeleton className={styles.visibilitySkeleton} />
    )

    const dash = <span className={styles.muted}>{'—'}</span>

    return (
        <div
            role={'row'}
            className={cn(styles.row, styles.item, status === 'none' && styles.dim)}
        >
            <div
                role={'cell'}
                className={styles.object}
            >
                {object.cover ? (
                    // A plain <img>: the 160 px square thumb is already the right source for 48 px,
                    // and next/image would add a 16-entry srcset to every one of ~100 rows
                    // eslint-disable-next-line next/no-img-element
                    <img
                        className={styles.thumb}
                        src={object.cover}
                        alt={''}
                        width={48}
                        height={48}
                        loading={'lazy'}
                        decoding={'async'}
                        onError={fallbackToMediumPhoto}
                    />
                ) : (
                    <span className={cn(styles.thumb, styles.thumbEmpty)}>
                        <Icon name={'StarEmpty'} />
                    </span>
                )}
                <div className={styles.name}>
                    <Link
                        href={`/objects/${object.name}`}
                        title={object.title || name}
                    >
                        {name}
                    </Link>
                    <small>{object.title || categoryTitles}</small>
                </div>
            </div>

            <div
                role={'cell'}
                className={styles.cellStatus}
            >
                <ObjectStatusBadge status={status} />
            </div>

            <div
                role={'cell'}
                className={cn(styles.exposure, styles.cellExposure)}
            >
                {object.exposure ? (
                    <>
                        <FilterSpectrum filters={object.filters} />
                        <span className={styles.exposureText}>{exposure}</span>
                    </>
                ) : (
                    <span className={styles.exposureText}>{dash}</span>
                )}
            </div>

            <div
                role={'cell'}
                className={cn(styles.right, styles.cellFrames)}
            >
                {object.frames || dash}
            </div>

            <div
                role={'cell'}
                className={cn(styles.right, styles.cellNights)}
            >
                {object.nights || dash}
            </div>

            <div
                role={'cell'}
                className={cn(styles.right, styles.cellLast)}
            >
                {object.lastNight
                    ? formatCalendarDate(object.lastNight, i18n.language, {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit'
                      })
                    : dash}
            </div>

            <div
                role={'cell'}
                className={cn(styles.right, styles.cellVisibility)}
            >
                {visibilityCell}
            </div>

            {/* Phones: the columns folded under the name; the row keeps its height while the visibility is computed */}
            <div
                className={styles.mobileMeta}
                aria-hidden={'true'}
            >
                {!!object.exposure && (
                    <>
                        <span>{exposure}</span>
                        <span>{t('common.frames', '{{count}} кадров', { count: object.frames })}</span>
                    </>
                )}
                <span className={cn(styles.visibility, styles[visibility?.level ?? 'none'])}>
                    <span className={styles.dot} />
                    {computed
                        ? t('components.pages.objects.objects-catalog.tonight-label', 'Сегодня: {{value}}', {
                              value: visibilityLabel
                          })
                        : t('components.pages.objects.objects-catalog.tonight-label', 'Сегодня: {{value}}', {
                              value: '…'
                          })}
                </span>
            </div>
        </div>
    )
}
