import React, { useMemo } from 'react'
import { Button, Container, Icon, Skeleton } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { StatusBadge } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import { formatDECShort, formatRAShort } from '@/utils/coordinates'
import { formatExposure } from '@/utils/dates'
import { formatObjectName } from '@/utils/strings'
import { formatObservatoryTime, getNight, getVisibility, isMovingObject, risesTonight } from '@/utils/visibility'

import { PhotoObjectSummary } from '../types'

import styles from './styles.module.sass'

interface PhotoObjectCardProps {
    object: PhotoObjectSummary
}

/**
 * The object on the picture in a few lines - what it is, whether it is up tonight, how much
 * of it the archive holds - and the way to its own page, where all of that is in full, and to
 * the star map. The photo page links to the object instead of repeating its data.
 */
export const PhotoObjectCard: React.FC<PhotoObjectCardProps> = ({ object }) => {
    const { t, i18n } = useTranslation()
    const now = useNow(5 * 60_000)

    const name = formatObjectName(object.name)
    const isMoving = isMovingObject(object.categories)
    const hasCoordinates = typeof object.ra === 'number' && typeof object.dec === 'number'
    const subtitle = object.title && object.title !== name ? object.title.replace(/\s*\([^)]*\)\s*$/, '') : undefined

    const visibility = useMemo(
        () =>
            now && hasCoordinates && !isMoving
                ? getVisibility(object.ra as number, object.dec as number, getNight(now))
                : undefined,
        [now, hasCoordinates, isMoving, object.ra, object.dec]
    )

    const archive = [
        formatExposure(object.exposure, t),
        object.frames ? t('common.frames', '{{count}} кадров', { count: object.frames }) : '',
        object.nights
            ? t('components.pages.photos.photo-object-card.nights', '{{count}} ночей', { count: object.nights })
            : ''
    ].filter(Boolean)

    const subtitleParts = [subtitle, ...(object.aliases ?? [])].filter(Boolean)

    return (
        <Container className={styles.photoObjectCard}>
            <div className={styles.header}>
                <div className={styles.identity}>
                    <h3 className={styles.title}>
                        <Link href={`/objects/${object.name}`}>{name}</Link>
                    </h3>
                    {!!subtitleParts.length && <p className={styles.subtitle}>{subtitleParts.join(' · ')}</p>}
                </div>
                {hasCoordinates && (
                    <Button
                        mode={'secondary'}
                        size={'small'}
                        icon={'Map'}
                        className={styles.starMap}
                        link={`/starmap?view=sky&c=${object.ra},${object.dec},0&z=4`}
                        label={t('common.star-map', 'Звёздная карта')}
                    />
                )}
            </div>

            {hasCoordinates && !isMoving && (
                <div className={styles.tonight}>
                    {!visibility ? (
                        <Skeleton className={styles.skeleton} />
                    ) : risesTonight(visibility) ? (
                        <StatusBadge
                            tone={'positive'}
                            dot={true}
                        >
                            {t(
                                'components.pages.photos.photo-object-card.tonight',
                                'Сегодня ночью до {{altitude}}° в {{time}}',
                                {
                                    altitude: Math.round(visibility.altitude),
                                    time: formatObservatoryTime(visibility.time, i18n.language)
                                }
                            )}
                        </StatusBadge>
                    ) : (
                        <StatusBadge tone={'neutral'}>
                            {t('components.pages.photos.photo-object-card.not-tonight', 'Сегодня ночью не поднимается')}
                        </StatusBadge>
                    )}
                </div>
            )}

            <dl className={styles.facts}>
                {object.constellation && (
                    <div>
                        <dt>{t('components.pages.photos.photo-object-card.constellation', 'Созвездие')}</dt>
                        <dd>{object.constellation}</dd>
                    </div>
                )}
                {hasCoordinates && (
                    <div>
                        <dt>{t('components.pages.photos.photo-object-card.coordinates', 'Координаты')}</dt>
                        <dd>{`${formatRAShort(object.ra)}, ${formatDECShort(object.dec)}`}</dd>
                    </div>
                )}
                {!!archive.length && (
                    <div>
                        <dt>{t('components.pages.photos.photo-object-card.archive', 'В FITS-архиве')}</dt>
                        <dd>{archive.join(' · ')}</dd>
                    </div>
                )}
                {(object.photosCount ?? 0) > 1 && (
                    <div>
                        <dt>{t('components.pages.photos.photo-object-card.photos', 'Снимков объекта')}</dt>
                        <dd>{object.photosCount?.toLocaleString(i18n.language)}</dd>
                    </div>
                )}
            </dl>

            <Link
                href={`/objects/${object.name}`}
                className={styles.cta}
            >
                {t('components.pages.photos.photo-object-card.cta', 'Видимость, журнал наблюдений и описание')}
                <Icon name={'KeyboardRight'} />
            </Link>
        </Container>
    )
}
