import React, { useMemo } from 'react'
import { Button } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'
import { JsonLdScript } from 'next-seo'

import { API, ApiModel, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { GalleryPhotoItem, PhotoCatalog, toGalleryPhoto, usePhotoFilters } from '@/components/pages/photos'
import { StatGrid } from '@/components/ui'
import { createPageUrl } from '@/utils/helpers'
import { hasPermission } from '@/utils/permissions'
import { removeSSRQueryCache } from '@/utils/ssrCache'
import { initSSRLocale } from '@/utils/ssrLocale'
import { formatObjectName } from '@/utils/strings'

interface PhotosPageProps {
    search: string
    category: number | null
    photosList: GalleryPhotoItem[]
    categoriesList: ApiModel.Category[]
}

const PhotosPage: NextPage<PhotosPageProps> = ({ search, category, photosList, categoriesList }) => {
    const { t, i18n } = useTranslation()

    const user = useAppSelector((state) => state.auth?.user)

    const { filters, updateFilters, resetFilters } = usePhotoFilters(search, category ?? undefined)

    const currentCategory = useMemo(
        () => categoriesList.find(({ id }) => id === filters.category),
        [categoriesList, filters.category]
    )

    const stats = useMemo(() => {
        const totals = photosList.reduce(
            (sum, photo) => ({
                exposure: sum.exposure + photo.exposure,
                views: sum.views + photo.views
            }),
            { exposure: 0, views: 0 }
        )
        const objects = new Set(photosList.flatMap(({ objects }) => objects)).size

        return [
            { value: photosList.length, label: t('pages.photos.stat-photos', 'снимков в галерее') },
            { value: objects, label: t('pages.photos.stat-objects', 'объектов на снимках') },
            {
                value: Math.round(totals.exposure / 3600).toLocaleString(i18n.language),
                unit: t('pages.objects.stat-hours-unit', 'ч'),
                label: t('pages.photos.stat-exposure', 'суммарной выдержки')
            },
            {
                value: totals.views.toLocaleString(i18n.language),
                label: t('pages.photos.stat-views', 'просмотров')
            }
        ]
    }, [photosList, t, i18n.language])

    const title = t('pages.photos.title', 'Астрофото')
    const seoTitle = t('pages.photos.seo-title', 'Астрофото галактик и туманностей — фотографии космоса')
    const pageUrl = createPageUrl(i18n.language, 'photos')

    // The gallery as an ImageGallery: every photo with its page and image
    const gallerySchema = useMemo(
        () => ({
            '@context': 'https://schema.org',
            '@type': 'ImageGallery',
            '@id': pageUrl,
            url: pageUrl,
            name: seoTitle,
            inLanguage: i18n.language === 'en' ? 'en' : 'ru',
            image: photosList.map((photo) => ({
                '@type': 'ImageObject',
                contentUrl: photo.src,
                name: photo.titles.join(', ') || photo.objects.map(formatObjectName).join(', '),
                url: createPageUrl(i18n.language, `photos/${photo.id}`)
            }))
        }),
        [photosList, pageUrl, seoTitle, i18n.language]
    )

    return (
        <AppLayout
            canonical={'photos'}
            title={currentCategory ? `${title}: ${currentCategory.title}` : seoTitle}
            description={[
                t(
                    'pages.photos.description',
                    'Астрофотографии галактик, туманностей, звёздных скоплений и планет, снятые любительской обсерваторией в Оренбурге. Фильтры, выдержка и оборудование для каждого снимка.'
                ),
                currentCategory?.description
            ]
                .filter(Boolean)
                .join(' ')}
            openGraph={{
                images: [
                    {
                        height: 1024,
                        url: '/images/index-hero.png',
                        width: 1536
                    }
                ]
            }}
        >
            <JsonLdScript
                scriptKey={'photos-gallery'}
                data={gallerySchema}
            />

            <AppToolbar
                title={currentCategory ? `${title}: ${currentCategory.title}` : title}
                lead={t(
                    'pages.photos.lead',
                    'Обработанные снимки обсерватории: каждый — часы выдержки через узкополосные и широкополосные фильтры, собранные за несколько ночей. На странице снимка — оборудование, фильтры и другие кадры того же объекта.'
                )}
                currentPage={currentCategory ? currentCategory.title : title}
                links={currentCategory ? [{ link: '/photos', text: title }] : undefined}
            >
                {hasPermission(user, ApiModel.Permission.PHOTOS_MANAGE) && (
                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        label={t('pages.photos.create_button', 'Добавить')}
                        link={'/photos/form'}
                    />
                )}
            </AppToolbar>

            <StatGrid
                items={stats}
                aria-label={t('pages.photos.stats-label', 'Сводка галереи')}
            />

            <PhotoCatalog
                photos={photosList}
                categories={categoriesList}
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
            />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<PhotosPageProps>> => {
            // Public page: nginx caches the HTML for a short while (config/nginx.conf)
            context.res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1200')

            const { translations } = await initSSRLocale(store, context)
            const search = (context.query.search as string) || ''
            const category = parseInt(context.query.category as string)

            const [{ data: photos }, { data: objects }, { data: categories }] = await Promise.all([
                store.dispatch(API.endpoints?.photosGetList.initiate()),
                store.dispatch(API.endpoints?.objectsGetList.initiate()),
                store.dispatch(API.endpoints?.categoriesGetList.initiate())
            ])

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            // Handed to the page as props - no need to also ship RTK Query's copy
            removeSSRQueryCache(store, ['photosGetList', 'objectsGetList', 'categoriesGetList'])

            // The objects' titles name the tiles and feed the search; only that map is kept
            const objectTitles = Object.fromEntries((objects?.items ?? []).map(({ name, title }) => [name, title]))

            return {
                props: {
                    ...translations,
                    search,
                    category: Number.isNaN(category) ? null : category,
                    photosList: (photos?.items ?? []).map((photo) => toGalleryPhoto(photo, objectTitles)),
                    categoriesList: (categories?.items ?? []).map(({ id, title, description }) => ({
                        id,
                        title,
                        ...(description ? { description } : {})
                    }))
                }
            }
        }
)

export default PhotosPage
