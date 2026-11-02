import React, { useMemo } from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'
import { JsonLdScript } from 'next-seo'

import { API, ApiModel, HOST_IMG, SITE_LINK, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, BreadcrumbJsonLd } from '@/components/common'
import { VisibilityChart } from '@/components/common/visibility-chart'
import {
    ObjectDescription,
    ObjectFilters,
    ObjectHero,
    ObjectPagePhoto,
    ObjectPhotos,
    ObservingLog,
    RelatedObject,
    RelatedObjects
} from '@/components/pages/objects'
import { SectionNav, SectionNavItem, StatGrid } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import { getConstellationName } from '@/utils/constellations'
import { formatDateRange, formatExposure, toISODateTime } from '@/utils/dates'
import { createPageUrl } from '@/utils/helpers'
import { groupFramesIntoNights, toObservingFrames } from '@/utils/observingLog'
import { hasPermission } from '@/utils/permissions'
import { createLargePhotoUrl, createMediumPhotoUrl } from '@/utils/photos'
import { removeSSRQueryCache } from '@/utils/ssrCache'
import { initSSRLocale } from '@/utils/ssrLocale'
import { createSeoDescription, formatObjectName } from '@/utils/strings'
import { getNight, getVisibility, isMovingObject } from '@/utils/visibility'

import styles from './styles.module.sass'

/** How many objects of the same category to link to */
const RELATED_LIMIT = 16

interface ObjectItemPageProps {
    objectName: string
    objectData: ApiModel.Object
    categories: ApiModel.Category[]
    photos: ObjectPagePhoto[]
    /** Large images of the newest photos, for the social preview and structured data */
    previewImages: Array<{ url: string; width?: number; height?: number }>
    related: RelatedObject[]
    constellation: string | null
}

const ObjectItemPage: NextPage<ObjectItemPageProps> = ({
    objectName,
    objectData,
    categories,
    photos,
    previewImages,
    related,
    constellation
}) => {
    const { t, i18n } = useTranslation()

    const user = useAppSelector((state) => state.auth?.user)
    const now = useNow(5 * 60_000)

    const hasFrames = !!objectData.statistic?.frames
    const isMoving = isMovingObject(objectData.categories)
    const hasCoordinates = typeof objectData.ra === 'number' && typeof objectData.dec === 'number'

    // The frames are loaded on the client: the log is below the fold and can run to hundreds of rows
    const {
        data: filesData,
        isLoading: filesLoading,
        isError: filesError,
        refetch: refetchFiles
    } = API.useFilesGetListQuery(objectName, { skip: !hasFrames })

    const nights = useMemo(() => groupFramesIntoNights(toObservingFrames(filesData?.items)), [filesData])

    const visibility = useMemo(
        () =>
            now && hasCoordinates && !isMoving
                ? getVisibility(objectData.ra as number, objectData.dec as number, getNight(now))
                : undefined,
        [now, hasCoordinates, isMoving, objectData.ra, objectData.dec]
    )

    const name = formatObjectName(objectName)
    const title = objectData.title || name
    const description = createSeoDescription(objectData.description)
    const pageUrl = createPageUrl(i18n.language, `objects/${objectName}`)

    // People find these pages by the object's name ("туманность сердце", "ngc 7331") and
    // mostly want to see it, so the <title> promises the photos when there are any
    const seoTitle = photos.length
        ? t('pages.object.seo-title-photos', '{{title}}: фото и описание', { title })
        : t('pages.object.seo-title', '{{title}}: описание и координаты', { title })

    // The object's own astrophotos make a far better preview / rich-result image than the
    // generated star chart in `objectData.image`, which stays the fallback
    const images = useMemo(
        () =>
            previewImages.length
                ? previewImages.map((image) => ({ ...image, alt: title }))
                : [
                      {
                          url: objectData.image ? `${HOST_IMG}${objectData.image}` : 'images/no-photo.png',
                          width: 487,
                          height: 244,
                          alt: title
                      }
                  ],
        [previewImages, objectData.image, title]
    )

    const articleSchema = useMemo(
        () => ({
            '@context': 'https://schema.org',
            '@type': 'Article',
            '@id': pageUrl,
            mainEntityOfPage: pageUrl,
            headline: title,
            description,
            image: images.map(({ url }) => (url.startsWith('http') ? url : `${SITE_LINK}${url}`)),
            url: pageUrl,
            inLanguage: i18n.language === 'en' ? 'en' : 'ru',
            dateModified: toISODateTime(objectData.updated?.date),
            about: {
                '@type': 'Thing',
                name: title,
                alternateName: name,
                ...(constellation ? { description: constellation } : {})
            },
            author: {
                '@type': 'Organization',
                name: 'Смотри на звёзды',
                url: SITE_LINK
            },
            publisher: {
                '@type': 'Organization',
                name: 'Смотри на звёзды',
                url: SITE_LINK,
                logo: {
                    '@type': 'ImageObject',
                    url: `${SITE_LINK}android-chrome-192x192.png`
                }
            }
        }),
        [objectData.updated?.date, name, title, description, images, pageUrl, constellation, i18n.language]
    )

    const kpis = [
        {
            value: formatExposure(objectData.statistic?.exposure, t) || '—',
            label: t('pages.object.kpi-exposure', 'суммарная выдержка')
        },
        {
            value: (objectData.statistic?.frames ?? 0).toLocaleString(i18n.language),
            label: t('pages.object.kpi-frames', 'кадров в FITS-архиве')
        },
        {
            value: objectData.nights ?? 0,
            label: t('pages.object.kpi-nights', 'ночей съёмки')
        },
        {
            value:
                objectData.firstNight && objectData.lastNight
                    ? objectData.firstNight.slice(0, 4) === objectData.lastNight.slice(0, 4)
                        ? objectData.firstNight.slice(0, 4)
                        : `${objectData.firstNight.slice(0, 4)}–${objectData.lastNight.slice(0, 4)}`
                    : '—',
            label:
                objectData.firstNight && objectData.lastNight
                    ? t('pages.object.kpi-period', 'период съёмки: {{range}}', {
                          range: formatDateRange(objectData.firstNight, objectData.lastNight, i18n.language)
                      })
                    : t('pages.object.kpi-period-empty', 'период съёмки')
        }
    ]

    const showChart = hasCoordinates && !isMoving
    const showFilters = !!Object.keys(objectData.filters ?? {}).length
    const firstCategory = categories[0]

    const sections = useMemo<SectionNavItem[]>(
        () => [
            ...(showChart || showFilters
                ? [{ id: 'visibility', label: t('pages.object.nav-visibility', 'Видимость и сигнал') }]
                : []),
            ...(hasFrames ? [{ id: 'log', label: t('pages.object.nav-log', 'Журнал наблюдений') }] : []),
            ...(photos.length ? [{ id: 'photos', label: t('pages.object.nav-photos', 'Снимки') }] : []),
            ...(objectData.description || related.length
                ? [{ id: 'about', label: t('pages.object.nav-about', 'Об объекте') }]
                : [])
        ],
        [showChart, showFilters, hasFrames, photos.length, objectData.description, related.length, t]
    )

    return (
        <AppLayout
            canonical={`objects/${objectName}`}
            title={seoTitle}
            description={description}
            openGraph={{ type: 'article', images }}
        >
            <JsonLdScript
                scriptKey={'object-article'}
                data={articleSchema}
            />
            <BreadcrumbJsonLd
                links={[{ link: '/objects', text: t('menu.objects', 'Объекты') }]}
                currentPage={name}
            />

            <ObjectHero
                object={objectData}
                name={name}
                categories={categories}
                photo={photos[0]}
                photosCount={photos.length}
                constellation={constellation ?? undefined}
                visibility={visibility}
                isMoving={isMoving}
                adminActions={
                    hasPermission(user, ApiModel.Permission.OBJECTS_MANAGE) && (
                        <Button
                            icon={'Pencil'}
                            mode={'outline'}
                            label={t('common.edit', 'Редактировать')}
                            link={`/objects/form/?id=${objectName}`}
                        />
                    )
                }
            />

            {hasFrames && (
                <StatGrid
                    items={kpis}
                    aria-label={t('pages.object.kpis-label', 'Сводка наблюдений')}
                />
            )}

            {sections.length > 1 && (
                <SectionNav
                    items={sections}
                    aria-label={t('pages.object.nav-label', 'Разделы страницы')}
                />
            )}

            {(showChart || showFilters) && (
                <section
                    id={'visibility'}
                    className={styles.section}
                    aria-labelledby={'visibility-title'}
                >
                    <h2 id={'visibility-title'}>{t('pages.object.visibility-title', 'Видимость и сбор сигнала')}</h2>
                    <div className={cn(styles.split, (!showChart || !showFilters) && styles.single)}>
                        {showFilters && (
                            <ObjectFilters
                                filters={objectData.filters}
                                statistic={objectData.statistic}
                                nights={objectData.nights}
                            />
                        )}
                        {showChart && (
                            <VisibilityChart
                                ra={objectData.ra as number}
                                dec={objectData.dec as number}
                                name={name}
                            />
                        )}
                    </div>
                </section>
            )}

            {hasFrames && (
                <section
                    id={'log'}
                    className={styles.section}
                    aria-labelledby={'log-title'}
                >
                    <h2
                        id={'log-title'}
                        className={styles.titleWithMeta}
                    >
                        {t('pages.object.log-title', 'Журнал наблюдений')}
                        <small>
                            {t('pages.object.log-nights', '{{count}} ночей', { count: objectData.nights ?? 0 })}
                            {' · '}
                            {t('common.frames', '{{count}} кадров', { count: objectData.statistic?.frames ?? 0 })}
                        </small>
                    </h2>
                    <ObservingLog
                        nights={nights}
                        loading={filesLoading}
                        error={filesError}
                        onRetry={refetchFiles}
                    />
                </section>
            )}

            {!!photos.length && (
                <section
                    id={'photos'}
                    className={styles.section}
                    aria-labelledby={'photos-title'}
                >
                    <h2
                        id={'photos-title'}
                        className={styles.titleWithMeta}
                    >
                        {t('pages.object.photos-title', 'Снимки объекта')}
                        <small>
                            {t(
                                'pages.object.photos-note',
                                'Каждый снимок — отдельная обработка; параметры и оборудование на странице снимка'
                            )}
                        </small>
                    </h2>
                    <ObjectPhotos
                        photos={photos}
                        name={name}
                    />
                </section>
            )}

            {(!!objectData.description || !!related.length) && (
                <section
                    id={'about'}
                    className={styles.section}
                    aria-labelledby={'about-title'}
                >
                    <h2 id={'about-title'}>{t('pages.object.about-title', 'Об объекте')}</h2>
                    {objectData.description && <ObjectDescription text={objectData.description} />}

                    {!!related.length && firstCategory && (
                        <>
                            <h3 className={styles.relatedTitle}>
                                {t('pages.object.related-title', 'Ещё в категории «{{category}}»', {
                                    category: firstCategory.title
                                })}
                            </h3>
                            <RelatedObjects
                                objects={related}
                                aria-label={t('pages.object.related-label', 'Другие объекты категории')}
                            />
                        </>
                    )}
                </section>
            )}

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<ObjectItemPageProps>> => {
            const { translations, locale } = await initSSRLocale(store, context)
            const objectName = context.params?.name

            if (typeof objectName !== 'string') {
                return { notFound: true }
            }

            const {
                data: objectData,
                isError,
                error
            } = await store.dispatch(API.endpoints?.objectsGetItem.initiate(objectName))

            // Only an unknown name is a 404: an API outage must not tell crawlers the page is gone
            if (isError && (error as { status?: number } | undefined)?.status !== 404) {
                throw new Error(`Objects API unavailable: ${objectName}`)
            }

            if (!objectData) {
                return { notFound: true }
            }

            // Public page: nginx caches the HTML for a short while (config/nginx.conf), so a burst
            // of visitors costs the API one request. Set only for an existing object, so random
            // names don't fill the cache with 404 pages
            context.res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1200')

            // The list and the categories are cached by the API; only the same-category names are kept
            const [{ data: objectsList }, { data: categoriesData }, { data: photosData }] = await Promise.all([
                store.dispatch(API.endpoints?.objectsGetList.initiate()),
                store.dispatch(API.endpoints?.categoriesGetList.initiate()),
                store.dispatch(API.endpoints?.photosGetList.initiate({ object: objectName }))
            ])

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            // The object itself is handed over as props too; no hook on this page reads the cache
            removeSSRQueryCache(store, ['objectsGetItem', 'objectsGetList', 'categoriesGetList', 'photosGetList'])

            const sortedPhotos = [...(photosData?.items ?? [])].sort((a, b) =>
                (b.date ?? '').localeCompare(a.date ?? '')
            )

            const categories = (categoriesData?.items ?? [])
                .filter(({ id }) => objectData.categories?.includes(id))
                .map(({ id, title }) => ({ id, title }))

            const firstCategory = objectData.categories?.[0]

            const related = (objectsList?.items ?? [])
                .filter(
                    ({ name, categories }) =>
                        name !== objectName && firstCategory && categories?.includes(firstCategory)
                )
                // The ones with photos first: the better pages to go to
                .sort((a, b) => (b.photosCount ?? 0) - (a.photosCount ?? 0) || a.name.localeCompare(b.name))
                .slice(0, RELATED_LIMIT)
                .map(({ name, title }) => ({ name, title }))

            const { ra, dec } = objectData

            return {
                props: {
                    ...translations,
                    objectName,
                    objectData,
                    categories,
                    photos: sortedPhotos.map((photo) => ({
                        id: photo.id,
                        ...(photo.date ? { date: photo.date.slice(0, 10) } : {}),
                        src: createMediumPhotoUrl(photo),
                        large: createLargePhotoUrl(photo)
                    })),
                    previewImages: sortedPhotos.slice(0, 3).map((photo) => ({
                        url: createLargePhotoUrl(photo),
                        ...(photo.imageWidth ? { width: photo.imageWidth } : {}),
                        ...(photo.imageHeight ? { height: photo.imageHeight } : {})
                    })),
                    related,
                    constellation:
                        typeof ra === 'number' && typeof dec === 'number'
                            ? (getConstellationName(ra, dec, locale) ?? null)
                            : null
                }
            }
        }
)

export default ObjectItemPage
