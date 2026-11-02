import React, { useMemo } from 'react'
import { Button, Icon } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'
import { JsonLdScript } from 'next-seo'

import { API, ApiModel, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import {
    CatalogObject,
    ObjectsCatalog,
    toCatalogObject,
    TonightStrip,
    useCatalogFilters,
    useCatalogVisibility
} from '@/components/pages/objects'
import { StatGrid } from '@/components/ui'
import { createPageUrl } from '@/utils/helpers'
import { hasPermission } from '@/utils/permissions'
import { removeSSRQueryCache } from '@/utils/ssrCache'
import { initSSRLocale } from '@/utils/ssrLocale'
import { formatObjectName } from '@/utils/strings'

import styles from './styles.module.sass'

interface ObjectsPageProps {
    search: string
    category: number | null
    categoriesList: ApiModel.Category[]
    objectsList: CatalogObject[]
}

const ObjectsPage: NextPage<ObjectsPageProps> = ({ search, category, categoriesList, objectsList }) => {
    const { t, i18n } = useTranslation()

    const user = useAppSelector((state) => state.auth?.user)

    const { filters, updateFilters, resetFilters } = useCatalogFilters(search, category ?? undefined)
    const visibility = useCatalogVisibility(objectsList)

    const currentCategory = useMemo(
        () => categoriesList.find(({ id }) => id === filters.category),
        [categoriesList, filters.category]
    )

    const stats = useMemo(() => {
        const totals = objectsList.reduce(
            (sum, object) => ({
                exposure: sum.exposure + object.exposure,
                frames: sum.frames + object.frames,
                withPhoto: sum.withPhoto + (object.photosCount ? 1 : 0)
            }),
            { exposure: 0, frames: 0, withPhoto: 0 }
        )

        return [
            {
                value: objectsList.length,
                label: t('pages.objects.stat-objects', 'объектов в журнале')
            },
            {
                value: totals.withPhoto,
                unit: t('pages.objects.stat-of', 'из {{total}}', { total: objectsList.length }),
                label: t('pages.objects.stat-with-photo', 'уже с готовым фото')
            },
            {
                value: Math.round(totals.exposure / 3600).toLocaleString(i18n.language),
                unit: t('pages.objects.stat-hours-unit', 'ч'),
                label: t('pages.objects.stat-exposure', 'суммарной выдержки')
            },
            {
                value: totals.frames.toLocaleString(i18n.language),
                label: t('pages.objects.stat-frames', 'FITS-кадров в архиве')
            }
        ]
    }, [objectsList, t, i18n.language])

    const title = t('pages.objects.title', 'Каталог астрономических объектов')
    const seoTitle = t('pages.objects.seo-title', 'Каталог галактик и туманностей с астрофото')
    const pageUrl = createPageUrl(i18n.language, 'objects')

    // The catalog as a CollectionPage with its objects as an ItemList: the names people search for
    const collectionSchema = useMemo(
        () => ({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': pageUrl,
            url: pageUrl,
            name: seoTitle,
            inLanguage: i18n.language === 'en' ? 'en' : 'ru',
            mainEntity: {
                '@type': 'ItemList',
                numberOfItems: objectsList.length,
                itemListElement: objectsList.map((object, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    name: object.title || formatObjectName(object.name),
                    url: createPageUrl(i18n.language, `objects/${object.name}`)
                }))
            }
        }),
        [objectsList, pageUrl, seoTitle, i18n.language]
    )

    return (
        <AppLayout
            canonical={'objects'}
            title={currentCategory ? `${title}: ${currentCategory.title}` : seoTitle}
            description={[
                t(
                    'pages.objects.description',
                    'Каталог галактик, туманностей, звёздных скоплений и комет, снятых любительской обсерваторией в Оренбурге: астрофото, описания, координаты и выдержка по фильтрам.'
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
                scriptKey={'objects-collection'}
                data={collectionSchema}
            />

            <AppToolbar
                title={currentCategory ? `${title}: ${currentCategory.title}` : title}
                lead={t(
                    'pages.objects.lead',
                    'Всё, что снимала обсерватория: сколько ночей и кадров набрано по каждой цели, в каких фильтрах, FITS-архив и когда объект лучше всего виден из Оренбурга.'
                )}
                currentPage={currentCategory ? currentCategory.title : t('menu.objects', 'Объекты')}
                links={currentCategory ? [{ link: '/objects', text: t('menu.objects', 'Объекты') }] : undefined}
            >
                {hasPermission(user, ApiModel.Permission.OBJECTS_MANAGE) && (
                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        label={t('pages.objects.create_button', 'Добавить')}
                        link={'/objects/form'}
                    />
                )}
            </AppToolbar>

            <StatGrid
                items={stats}
                aria-label={t('pages.objects.stats-label', 'Сводка каталога')}
            />

            <TonightStrip
                objects={objectsList}
                visibility={visibility}
            />

            <ObjectsCatalog
                objects={objectsList}
                categories={categoriesList}
                filters={filters}
                visibility={visibility}
                onChange={updateFilters}
                onReset={resetFilters}
            />

            <aside className={styles.galleryLink}>
                <Icon name={'Photo'} />
                <p>
                    <b>{t('pages.objects.gallery-title', 'Ищете готовые снимки?')}</b>
                    {t(
                        'pages.objects.gallery-text',
                        'Обработанные астрофотографии — в галерее, с просмотром на весь экран.'
                    )}
                </p>
                <Button
                    mode={'secondary'}
                    link={'/photos'}
                    label={t('pages.objects.gallery-button', 'Открыть галерею')}
                />
            </aside>

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<ObjectsPageProps>> => {
            // Public page: nginx caches the HTML for a short while (config/nginx.conf), so a burst
            // of visitors costs the API one request
            context.res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1200')

            const { translations } = await initSSRLocale(store, context)
            const search = (context.query.search as string) || ''
            const category = parseInt(context.query.category as string)

            // The objects list carries each object's cover photo, so the page needs no photos list
            const { data: objects } = await store.dispatch(API.endpoints?.objectsGetList.initiate())

            const { data: categories } = await store.dispatch(API.endpoints?.categoriesGetList.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            // Handed to the page as props - no need to also ship RTK Query's copy
            removeSSRQueryCache(store, ['objectsGetList', 'categoriesGetList'])

            return {
                props: {
                    ...translations,
                    search,
                    category: Number.isNaN(category) ? null : category,
                    categoriesList: (categories?.items || []).map(({ id, title, description }) => ({
                        id,
                        title,
                        ...(description ? { description } : {})
                    })),
                    objectsList: (objects?.items || []).map(toCatalogObject)
                }
            }
        }
)

export default ObjectsPage
