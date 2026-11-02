import React, { useState } from 'react'
import { Button, cn, Skeleton } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { Breadcrumbs, StatusBadge } from '@/components/ui'
import { formatDECShort, formatRAShort } from '@/utils/coordinates'
import { formatCalendarDate } from '@/utils/dates'
import { getObjectStatus } from '@/utils/objects'
import { createSkySurveyUrl } from '@/utils/skySurvey'
import { formatObservatoryTime, isCircumpolar, risesTonight, Visibility } from '@/utils/visibility'

import { ObjectStatusBadge } from '../object-status-badge'
import { ObjectPagePhoto } from '../types'

import styles from './styles.module.sass'

interface ObjectHeroProps {
    object: ApiModel.Object
    /** The catalog name, as people write it: "IC 1396" */
    name: string
    /** The object's categories, for the eyebrow and links back to the filtered catalog */
    categories: ApiModel.Category[]
    /** The newest photo */
    photo?: ObjectPagePhoto
    photosCount: number
    constellation?: string
    /** Tonight's visibility: `undefined` until computed on the client */
    visibility?: Visibility
    /** A comet, an asteroid or a planet: its coordinates are from the shooting date */
    isMoving?: boolean
    /** Rendered after the main actions: the editor's buttons */
    adminActions?: React.ReactNode
}

/**
 * The object at a glance: its newest photo, the name, what it is, the facts an observer
 * needs (coordinates, constellation, tonight's altitude) and the FITS archive.
 */
export const ObjectHero: React.FC<ObjectHeroProps> = ({
    object,
    name,
    categories,
    photo,
    photosCount,
    constellation,
    visibility,
    isMoving,
    adminActions
}) => {
    const { t, i18n } = useTranslation()

    const status = getObjectStatus({ ...object, photosCount })
    const hasFrames = status !== 'none'
    const subtitle = object.title && object.title !== name ? object.title.replace(/\s*\([^)]*\)\s*$/, '') : undefined
    const hasCoordinates = typeof object.ra === 'number' && typeof object.dec === 'number'

    // Without a photo of our own: the same piece of the sky from the DSS2 survey. A moving body
    // has no fixed place to show; an unreachable survey leaves the facts the whole width
    const [surveyFailed, setSurveyFailed] = useState(false)
    const surveyUrl =
        !photo && hasCoordinates && !isMoving && !surveyFailed
            ? createSkySurveyUrl(object.ra as number, object.dec as number, object.optics)
            : undefined

    const tonight = isMoving ? (
        t('components.pages.objects.object-hero.moving', 'движется по небу')
    ) : !visibility ? (
        <Skeleton className={styles.factSkeleton} />
    ) : risesTonight(visibility) ? (
        <>
            {t('components.pages.objects.object-hero.up-to', 'до {{altitude}}°', {
                altitude: Math.round(visibility.altitude)
            })}{' '}
            <small>
                {t('components.pages.objects.object-hero.at-time', 'в {{time}}', {
                    time: formatObservatoryTime(visibility.time, i18n.language)
                })}
            </small>
        </>
    ) : (
        t('components.pages.objects.object-hero.does-not-rise', 'не поднимается')
    )

    const facts: Array<{ label: string; value?: React.ReactNode }> = [
        {
            label: t('components.pages.objects.object-hero.right-ascension', 'Прямое восхождение'),
            value: formatRAShort(object.ra)
        },
        {
            label: t('components.pages.objects.object-hero.declination', 'Склонение'),
            value: formatDECShort(object.dec)
        },
        { label: t('components.pages.objects.object-hero.constellation', 'Созвездие'), value: constellation },
        {
            label: t('components.pages.objects.object-hero.distance', 'Расстояние'),
            value: object.distance ? (
                <>
                    {`≈ ${Math.round(object.distance).toLocaleString(i18n.language)} `}
                    <small>{t('components.pages.objects.object-hero.light-years', 'св. лет')}</small>
                </>
            ) : undefined
        },
        {
            label: t('components.pages.objects.object-hero.magnitude', 'Звёздная величина'),
            value:
                typeof object.magnitude === 'number' ? `${object.magnitude.toLocaleString(i18n.language)}ᵐ` : undefined
        },
        {
            label: t('components.pages.objects.object-hero.tonight', 'Сегодня ночью'),
            value: hasCoordinates ? tonight : undefined
        },
        {
            label: t('components.pages.objects.object-hero.circumpolar', 'Не заходит'),
            value:
                hasCoordinates && !isMoving
                    ? isCircumpolar(object.dec as number)
                        ? t('components.pages.objects.object-hero.circumpolar-yes', 'да, околополярный')
                        : t('components.pages.objects.object-hero.circumpolar-no', 'нет')
                    : undefined
        }
    ]

    return (
        <div className={styles.objectHero}>
            <Breadcrumbs
                className={styles.breadcrumbs}
                homePageTitle={t('common.look-at-the-stars', 'Смотри на звёзды')}
                links={[{ link: '/objects', text: t('menu.objects', 'Объекты') }]}
                currentPage={name}
            />

            <div className={cn(styles.grid, !photo && !surveyUrl && styles.single)}>
                {photo ? (
                    <Link
                        href={`/photos/${photo.id}`}
                        className={styles.photo}
                        title={t('components.pages.objects.object-hero.open-photo', 'Открыть снимок {{name}}', {
                            name
                        })}
                    >
                        <Image
                            src={photo.large}
                            alt={t('components.pages.objects.object-hero.photo-alt', 'Фото {{name}}', {
                                name: object.title || name
                            })}
                            fill={true}
                            preload={true}
                            loading={'eager'}
                            sizes={'(max-width: 768px) 100vw, 620px'}
                        />
                        {photo.date && (
                            <span className={cn(styles.pill, styles.pillLeft)}>
                                {t('components.pages.objects.object-hero.photo-date', 'Снимок от {{date}}', {
                                    date: formatCalendarDate(photo.date, i18n.language)
                                })}
                            </span>
                        )}
                        {photosCount > 1 && (
                            <span className={cn(styles.pill, styles.pillRight)}>
                                {t('components.pages.objects.object-hero.photos-count', '{{count}} снимков', {
                                    count: photosCount
                                })}
                            </span>
                        )}
                    </Link>
                ) : surveyUrl ? (
                    <div
                        className={cn(styles.photo, styles.survey)}
                        title={t(
                            'components.pages.objects.object-hero.survey-credit',
                            'Digitized Sky Survey (STScI), через NASA SkyView'
                        )}
                    >
                        <Image
                            src={surveyUrl}
                            alt={t('components.pages.objects.object-hero.survey-alt', '{{name}} в обзоре неба DSS2', {
                                name: object.title || name
                            })}
                            fill={true}
                            sizes={'(max-width: 768px) 100vw, 620px'}
                            onError={() => setSurveyFailed(true)}
                        />
                        <span className={cn(styles.pill, styles.pillLeft)}>
                            {t('components.pages.objects.object-hero.survey', 'Обзор неба DSS2')}
                        </span>
                        <span className={cn(styles.pill, styles.pillRight)}>
                            {hasFrames
                                ? t('components.pages.objects.object-hero.no-photo-frames', 'Нашего снимка пока нет')
                                : t('components.pages.objects.object-hero.no-photo', 'Объект ещё не снимался')}
                        </span>
                    </div>
                ) : null}

                <div className={styles.info}>
                    {!!categories.length && (
                        <p className={styles.overline}>
                            {categories.map(({ id, title }, i) => (
                                <React.Fragment key={id}>
                                    {i > 0 && ' · '}
                                    <Link
                                        href={`/objects?category=${id}`}
                                        title={t(
                                            'components.pages.objects.object-hero.category-link',
                                            'Все объекты: {{category}}',
                                            {
                                                category: title
                                            }
                                        )}
                                    >
                                        {title}
                                    </Link>
                                </React.Fragment>
                            ))}
                        </p>
                    )}

                    <h1 className={styles.title}>{name}</h1>
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

                    <div className={styles.badges}>
                        <ObjectStatusBadge
                            status={status}
                            dot={true}
                        />
                        {risesTonight(visibility) && (
                            <StatusBadge
                                tone={
                                    visibility.level === 'high'
                                        ? 'positive'
                                        : visibility.level === 'low'
                                          ? 'warning'
                                          : 'neutral'
                                }
                                dot={true}
                            >
                                {t(
                                    'components.pages.objects.object-hero.tonight-badge',
                                    'Сегодня: {{altitude}}° над горизонтом',
                                    {
                                        altitude: Math.round(visibility.altitude)
                                    }
                                )}
                            </StatusBadge>
                        )}
                    </div>

                    <dl className={styles.facts}>
                        {facts
                            .filter(({ value }) => value !== undefined && value !== '')
                            .map(({ label, value }) => (
                                <div key={label}>
                                    <dt>{label}</dt>
                                    <dd>{value}</dd>
                                </div>
                            ))}
                    </dl>

                    <div className={styles.actions}>
                        {object.fitsCloudLink && hasFrames && (
                            <Button
                                mode={'primary'}
                                className={styles.primaryAction}
                                icon={'Download'}
                                link={object.fitsCloudLink}
                                noIndex={true}
                                label={t('components.pages.objects.object-hero.download-fits', 'Скачать FITS-архив')}
                            />
                        )}
                        {hasCoordinates && (
                            <Button
                                mode={'secondary'}
                                icon={'Map'}
                                link={`/starmap?view=sky&c=${object.ra},${object.dec},0&z=4`}
                                label={t('components.pages.objects.object-hero.on-star-map', 'На звёздной карте')}
                            />
                        )}
                        {adminActions}
                    </div>
                </div>
            </div>
        </div>
    )
}
