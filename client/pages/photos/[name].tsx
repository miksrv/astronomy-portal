import React, { useMemo, useState } from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'
import { JsonLdScript } from 'next-seo'

import { API, ApiModel, SITE_LINK, useAppSelector, wrapper } from '@/api'
import { hosts } from '@/api/constants'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import {
    PhotoHistory,
    PhotoInfo,
    PhotoObjectCard,
    PhotoObjectSummary,
    PhotoSetup,
    PhotoStrip,
    PhotoVersion,
    PhotoViewer,
    StripPhoto
} from '@/components/pages/photos'
import { getConstellationName } from '@/utils/constellations'
import { formatCalendarDate, toISODateTime } from '@/utils/dates'
import { createPageUrl } from '@/utils/helpers'
import { getImageField, Optics } from '@/utils/optics'
import { hasPermission } from '@/utils/permissions'
import { createLargePhotoUrl, createMediumPhotoUrl } from '@/utils/photos'
import { removeSSRQueryCache } from '@/utils/ssrCache'
import { initSSRLocale } from '@/utils/ssrLocale'
import { formatObjectName } from '@/utils/strings'

import styles from './styles.module.sass'

/** How many photos of other objects in the same category to show */
const RELATED_LIMIT = 12

/** A photo as one processing of its object */
const toVersion = (item: ApiModel.Photo): PhotoVersion => ({
    id: item.id,
    ...(item.date ? { date: item.date.slice(0, 10) } : {}),
    src: createMediumPhotoUrl(item),
    large: createLargePhotoUrl(item),
    ...(item.imageWidth ? { width: item.imageWidth } : {}),
    ...(item.imageHeight ? { height: item.imageHeight } : {}),
    ...(item.statistic?.exposure ? { exposure: item.statistic.exposure } : {}),
    ...(item.statistic?.frames ? { frames: item.statistic.frames } : {}),
    ...(item.filters ? { filters: item.filters } : {})
})

interface PhotoItemPageProps {
    photoId: string
    photo: ApiModel.Photo
    /** The objects on the photo, with their titles */
    objects: Array<{ name: string; title: string }>
    categories: ApiModel.Category[]
    equipment: ApiModel.Equipment[]
    /** The optical train the main object's frames were taken with, from the FITS headers */
    optics: Optics | null
    /** Every processing of the same objects, the newest first (this one included) */
    versions: PhotoVersion[]
    /** The main object, for the card linking to its page and the sky frame */
    object: PhotoObjectSummary | null
    /** The newest photo of other objects in the same category */
    related: StripPhoto[]
    /** The neighbours in the gallery (the newest first) */
    previousId: string | null
    nextId: string | null
}

const PhotoItemPage: NextPage<PhotoItemPageProps> = ({
    photoId,
    photo,
    objects,
    categories,
    equipment,
    optics,
    versions,
    object,
    related,
    previousId,
    nextId
}) => {
    const { t, i18n } = useTranslation()

    const user = useAppSelector((state) => state.auth?.user)

    const objectNames = objects.map(({ name }) => formatObjectName(name)).join(', ')
    const objectTitles = objects.map(({ title }) => title).join(', ')
    const date = formatCalendarDate(photo.date, i18n.language)
    const pageUrl = createPageUrl(i18n.language, `photos/${photoId}`)
    const original = `${hosts.photo}${photo.dirName}/${photo.fileName}.${photo.fileExt}`
    const firstCategory = categories[0]

    const current = versions.find(({ id }) => id === photoId) ?? toVersion(photo)
    const otherVersions = versions.filter(({ id }) => id !== photoId)
    const field = getImageField(photo.imageWidth, photo.imageHeight, optics)

    // The slider's version belongs to the photo it was picked on: walking to another photo
    // (the page stays mounted) turns it off
    const [compare, setCompare] = useState<{ photoId: string; id?: string }>()
    const compareId = compare?.photoId === photoId ? compare.id : undefined
    const setCompareId = (id?: string) => setCompare({ photoId, id })

    // Picked in the history below the fold: bring the slider into view
    const handleCompare = (id: string) => {
        setCompareId(id)
        window.scrollTo({
            top: 0,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        })
    }

    // The h1 names what is on the picture; people search by the object's title, so the
    // <title> carries it too
    const seoTitle = t('pages.photo.seo-title', '{{objects}} — астрофото от {{date}}', {
        objects: objectTitles,
        date: formatCalendarDate(photo.date, i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' })
    })

    const equipmentDescription = equipment
        .map(({ brand, model }) => [brand, model].filter(Boolean).join(' '))
        .filter(Boolean)
        .join('; ')

    const imageObjectSchema = useMemo(
        () => ({
            '@context': 'https://schema.org',
            '@type': 'ImageObject',
            '@id': pageUrl,
            name: seoTitle,
            contentUrl: createLargePhotoUrl(photo),
            width: photo.imageWidth,
            height: photo.imageHeight,
            url: pageUrl,
            datePublished: toISODateTime(photo.date),
            dateModified: toISODateTime(photo.updated?.date),
            about: objects.map(({ name, title: objectTitle }) => ({
                '@type': 'Thing',
                name: objectTitle,
                alternateName: formatObjectName(name),
                url: createPageUrl(i18n.language, `objects/${name}`)
            })),
            author: { '@type': 'Organization', name: 'Смотри на звёзды', url: SITE_LINK },
            copyrightHolder: { '@type': 'Organization', name: 'Смотри на звёзды' },
            license: 'https://creativecommons.org/licenses/by-nc/4.0/',
            // With `license`, makes the photo eligible for the "Licensable" badge in Google Images
            acquireLicensePage: `${SITE_LINK}about`,
            creditText: 'Смотри на звёзды'
        }),
        [photo, objects, pageUrl, seoTitle, i18n.language]
    )

    return (
        <AppLayout
            canonical={`photos/${photoId}`}
            title={seoTitle}
            description={
                equipmentDescription
                    ? t(
                          'pages.photo.description',
                          '{{photoTitle}}: астрофотография, снятая любительской обсерваторией в Оренбурге. Оборудование: {{equipment}}.',
                          { photoTitle: objectTitles, equipment: equipmentDescription }
                      )
                    : t(
                          'pages.photo.description-no-equipment',
                          '{{photoTitle}}: астрофотография, снятая любительской обсерваторией в Оренбурге.',
                          { photoTitle: objectTitles }
                      )
            }
            openGraph={{
                type: 'article',
                images: [
                    {
                        url: createLargePhotoUrl(photo),
                        width: photo.imageWidth,
                        height: photo.imageHeight,
                        alt: seoTitle
                    }
                ]
            }}
        >
            <JsonLdScript
                scriptKey={'photo-image-object'}
                data={imageObjectSchema}
            />
            <AppToolbar
                title={objectTitles || objectNames}
                links={[{ link: '/photos', text: t('menu.astrophoto', 'Астрофото') }]}
                // The page's own name in the path: which object and when (the date is also the
                // first fact of the label, for phones that show only the way back here)
                currentPage={t('pages.photo.title', 'Снимок {{objects}} от {{date}}', { objects: objectNames, date })}
            >
                {hasPermission(user, ApiModel.Permission.PHOTOS_MANAGE) && (
                    <Button
                        icon={'Pencil'}
                        mode={'secondary'}
                        label={t('common.edit', 'Редактировать')}
                        link={`/photos/form/?id=${photoId}`}
                    />
                )}
            </AppToolbar>

            {/* The work, as large as the first screen allows, on a black band across the window */}
            <PhotoViewer
                current={current}
                title={objectTitles || objectNames}
                previousId={previousId ?? undefined}
                nextId={nextId ?? undefined}
                versions={otherVersions}
                compareId={compareId}
                onCompareChange={setCompareId}
                field={field}
            />

            <PhotoInfo
                photo={photo}
                categories={categories}
                original={original}
            />

            {/* The setup and the history in the wide column, the object's card beside them: it
                stays in view while the column scrolls, so the way to the object is always at hand */}
            <div className={cn(styles.layout, !object && styles.single)}>
                <div className={styles.column}>
                    <section
                        className={styles.section}
                        aria-labelledby={'setup-title'}
                    >
                        <h2 id={'setup-title'}>{t('pages.photo.setup-title', 'Как снято')}</h2>
                        <PhotoSetup
                            photo={photo}
                            equipment={equipment}
                            optics={optics}
                            field={field}
                        />
                    </section>
                    {otherVersions.length > 0 && (
                        <section
                            className={styles.section}
                            aria-labelledby={'history-title'}
                        >
                            <h2
                                id={'history-title'}
                                className={styles.titleWithMeta}
                            >
                                {t('pages.photo.history-title', 'История съёмки {{objects}}', {
                                    objects: objectNames
                                })}
                                <small>{t('pages.photo.history-note', 'Каждый снимок — отдельная обработка')}</small>
                            </h2>
                            <PhotoHistory
                                versions={versions}
                                currentId={photoId}
                                compareId={compareId}
                                onCompare={handleCompare}
                                name={objectNames}
                            />
                        </section>
                    )}
                </div>
                {object && (
                    <aside
                        className={cn(styles.section, styles.aside)}
                        aria-labelledby={'object-title'}
                    >
                        <h2 id={'object-title'}>{t('pages.photo.object-title', 'Об объекте')}</h2>
                        <PhotoObjectCard object={object} />
                    </aside>
                )}
            </div>

            {!!related.length && firstCategory && (
                <section
                    className={styles.section}
                    aria-labelledby={'related-title'}
                >
                    <h2
                        id={'related-title'}
                        className={styles.titleWithMeta}
                    >
                        {t('pages.photo.related-title', 'Ещё снимки: {{category}}', {
                            category: firstCategory.title.toLowerCase()
                        })}
                        <Link href={`/photos?category=${firstCategory.id}`}>
                            {t('pages.photo.related-all', 'Все в галерее →')}
                        </Link>
                    </h2>
                    <PhotoStrip
                        photos={related}
                        name={firstCategory.title}
                    />
                </section>
            )}

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<PhotoItemPageProps>> => {
            const { translations, locale } = await initSSRLocale(store, context)
            const photoId = context.params?.name

            if (typeof photoId !== 'string') {
                return { notFound: true }
            }

            const { data: photo, isError } = await store.dispatch(API.endpoints?.photosGetItem.initiate(photoId))

            if (isError || !photo) {
                return { notFound: true }
            }

            // Public page: nginx caches the HTML for a short while (config/nginx.conf). Set only
            // for an existing photo, so random ids don't fill the cache with 404 pages
            context.res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1200')

            const mainObject = photo.objects?.[0]

            const [
                { data: objectsData },
                { data: photosData },
                { data: categoriesData },
                { data: equipmentData },
                mainObjectResult
            ] = await Promise.all([
                store.dispatch(API.endpoints?.objectsGetList.initiate()),
                store.dispatch(API.endpoints?.photosGetList.initiate()),
                store.dispatch(API.endpoints?.categoriesGetList.initiate()),
                store.dispatch(API.endpoints?.equipmentsGetList.initiate()),
                // The main object's page data carries the optics its frames were taken with
                mainObject ? store.dispatch(API.endpoints?.objectsGetItem.initiate(mainObject)) : undefined
            ])

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            removeSSRQueryCache(store, [
                'photosGetItem',
                'objectsGetItem',
                'objectsGetList',
                'photosGetList',
                'categoriesGetList',
                'equipmentsGetList'
            ])

            const allObjects = objectsData?.items ?? []
            const objectTitle = (name: string) =>
                allObjects.find((object) => object.name === name)?.title ?? formatObjectName(name)

            const objects = (photo.objects ?? []).map((name) => ({ name, title: objectTitle(name) }))

            const categories = (categoriesData?.items ?? [])
                .filter(({ id }) => photo.categories?.includes(id))
                .map(({ id, title }) => ({ id, title }))

            const equipment = (equipmentData?.items ?? [])
                .filter(({ id }) => photo.equipments?.includes(id))
                .map(({ id, type, brand, model, specifications }) => ({
                    id,
                    ...(type ? { type } : {}),
                    ...(brand ? { brand } : {}),
                    ...(model ? { model } : {}),
                    ...(specifications ? { specifications } : {})
                }))

            // The gallery's order: the newest first, like /photos
            const gallery = [...(photosData?.items ?? [])].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
            const position = gallery.findIndex((item) => item.id === photoId)

            const toStrip = (item: ApiModel.Photo, label?: string): StripPhoto => ({
                id: item.id,
                ...(item.date ? { date: item.date.slice(0, 10) } : {}),
                src: createMediumPhotoUrl(item),
                ...(label ? { label } : {})
            })

            const versions = gallery
                .filter((item) => item.objects?.some((name) => photo.objects?.includes(name)))
                .map(toVersion)

            const mainObjectData = mainObjectResult?.data
            const { ra, dec } = mainObjectData ?? {}
            const constellation =
                typeof ra === 'number' && typeof dec === 'number' ? getConstellationName(ra, dec, locale) : undefined
            const object: PhotoObjectSummary | null =
                mainObject && mainObjectData
                    ? {
                          name: mainObject,
                          title: mainObjectData.title || formatObjectName(mainObject),
                          ...(typeof ra === 'number' ? { ra } : {}),
                          ...(typeof dec === 'number' ? { dec } : {}),
                          ...(constellation ? { constellation } : {}),
                          ...(mainObjectData.categories ? { categories: mainObjectData.categories } : {}),
                          ...(mainObjectData.statistic?.exposure
                              ? { exposure: mainObjectData.statistic.exposure }
                              : {}),
                          ...(mainObjectData.statistic?.frames ? { frames: mainObjectData.statistic.frames } : {}),
                          ...(mainObjectData.nights ? { nights: mainObjectData.nights } : {}),
                          photosCount: gallery.filter((item) => item.objects?.includes(mainObject)).length
                      }
                    : null

            // The newest photo of every other object in the category, newest first
            const firstCategory = photo.categories?.[0]
            const seen = new Set<string>()
            const related: StripPhoto[] = []

            for (const item of gallery) {
                const name = item.objects?.[0]

                if (
                    !name ||
                    seen.has(name) ||
                    photo.objects?.includes(name) ||
                    firstCategory === undefined ||
                    !item.categories?.includes(firstCategory)
                ) {
                    continue
                }

                seen.add(name)
                related.push(toStrip(item, formatObjectName(name)))

                if (related.length >= RELATED_LIMIT) {
                    break
                }
            }

            return {
                props: {
                    ...translations,
                    photoId,
                    photo,
                    objects,
                    categories,
                    equipment,
                    optics: mainObjectData?.optics ?? null,
                    versions,
                    object,
                    related,
                    previousId: position > 0 ? (gallery[position - 1]?.id ?? null) : null,
                    nextId: position >= 0 && position < gallery.length - 1 ? (gallery[position + 1]?.id ?? null) : null
                }
            }
        }
)

export default PhotoItemPage
