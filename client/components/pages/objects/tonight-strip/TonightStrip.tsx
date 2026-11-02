import React, { useMemo } from 'react'
import { Skeleton } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { fallbackToMediumPhoto } from '@/utils/photos'
import { formatObjectName } from '@/utils/strings'
import { formatObservatoryTime, HIGH_ALTITUDE } from '@/utils/visibility'

import { CatalogObject, CatalogVisibility } from '../objects-catalog'

import styles from './styles.module.sass'

const MAX_ITEMS = 8

interface TonightStripProps {
    objects: CatalogObject[]
    /** Tonight's visibility, once computed on the client */
    visibility?: CatalogVisibility
}

/**
 * The photographed objects that climb highest tonight, as a row of cards with their best
 * altitude: what to look at in the catalog right now. Computed on the client; the row keeps
 * its height with skeletons until then.
 */
export const TonightStrip: React.FC<TonightStripProps> = ({ objects, visibility }) => {
    const { t, i18n } = useTranslation()

    const { items, highCount } = useMemo(() => {
        if (!visibility) {
            return { items: [], highCount: 0 }
        }

        const high = objects.filter(({ name }) => (visibility[name]?.altitude ?? -90) >= HIGH_ALTITUDE)
        const altitude = (name: string) => visibility[name]?.altitude ?? -90

        return {
            highCount: high.length,
            items: high
                .filter(({ cover }) => !!cover)
                .sort((a, b) => altitude(b.name) - altitude(a.name))
                .slice(0, MAX_ITEMS)
        }
    }, [objects, visibility])

    return (
        <section aria-labelledby={'tonight-title'}>
            <h2
                id={'tonight-title'}
                className={styles.title}
            >
                {t('components.pages.objects.tonight-strip.title', 'Высоко над горизонтом сегодня ночью')}
                {visibility && (
                    <small>
                        {t('components.pages.objects.tonight-strip.count', '{{count}} объектов выше 45°', {
                            count: highCount
                        })}
                    </small>
                )}
            </h2>

            <div className={styles.strip}>
                {!visibility &&
                    Array.from({ length: 4 }, (_, i) => (
                        <Skeleton
                            key={i}
                            className={styles.skeleton}
                        />
                    ))}

                {visibility && !items.length && (
                    <p className={styles.empty}>
                        {t(
                            'components.pages.objects.tonight-strip.empty',
                            'Этой ночью ни один из снятых объектов не поднимается выше 45°'
                        )}
                    </p>
                )}

                {items.map((object) => {
                    const { altitude = 0, time } = visibility?.[object.name] ?? {}
                    const name = formatObjectName(object.name)

                    return (
                        <Link
                            key={object.name}
                            href={`/objects/${object.name}`}
                            title={object.title}
                            className={styles.card}
                        >
                            {/* eslint-disable-next-line next/no-img-element -- the 160 px square thumb, no srcset needed */}
                            <img
                                className={styles.photo}
                                src={object.cover as string}
                                alt={''}
                                width={56}
                                height={56}
                                loading={'lazy'}
                                decoding={'async'}
                                onError={fallbackToMediumPhoto}
                            />
                            <span className={styles.text}>
                                <b>{name}</b>
                                <span>
                                    {t('components.pages.objects.tonight-strip.best-at', 'макс. в {{time}}', {
                                        time: formatObservatoryTime(time, i18n.language)
                                    })}
                                </span>
                            </span>
                            <span
                                className={styles.ring}
                                style={{ '--percent': Math.round((altitude / 90) * 100) } as React.CSSProperties}
                                aria-label={t(
                                    'components.pages.objects.tonight-strip.altitude',
                                    'Высота {{altitude}}°',
                                    {
                                        altitude: Math.round(altitude)
                                    }
                                )}
                            >
                                {`${Math.round(altitude)}°`}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </section>
    )
}
