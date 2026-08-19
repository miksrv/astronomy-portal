import React, { useEffect, useMemo, useState } from 'react'
import uniq from 'lodash-es/uniq'
import { Button, Input, Select } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, ApiModel, setLocale, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { PhotoGrid } from '@/components/pages/photos'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { hasPermission } from '@/utils/permissions'
import { formatObjectName } from '@/utils/strings'

interface PhotosPageProps {
    search: string
    photosList: ApiModel.Photo[]
    categoriesList: ApiModel.Category[]
}

const PhotosPage: NextPage<PhotosPageProps> = ({ search, photosList, categoriesList }) => {
    const { t } = useTranslation()
    const router = useRouter()

    const user = useAppSelector((state) => state.auth?.user)

    const [searchFilter, setSearchFilter] = useState<string | undefined>(search || undefined)
    const [debouncedSearchFilter, setDebouncedSearchFilter] = useDebouncedValue(searchFilter, 400)
    const [categoryFilter, setCategoryFilter] = useState<number | undefined>()

    const filteredCategoriesList = useMemo(
        () =>
            categoriesList?.filter(({ id }) => uniq(photosList?.flatMap(({ categories }) => categories))?.includes(id)),
        [categoriesList, photosList]
    )

    const filteredPhotosList = useMemo(
        () =>
            photosList
                ?.filter(({ categories }) => (categoryFilter ? categories?.includes(categoryFilter) : true))
                ?.filter(({ objects }) =>
                    searchFilter
                        ? objects
                              ?.flatMap((name) => formatObjectName(name))
                              ?.join('')
                              ?.toLowerCase()
                              .includes(searchFilter.toLowerCase())
                        : true
                )
                ?.sort((a, b) => new Date(b?.date || '').getTime() - new Date(a?.date || '').getTime()),
        [photosList, categoryFilter, searchFilter]
    )

    const currentCategory = useMemo(
        () => filteredCategoriesList?.find(({ id }) => id === categoryFilter),
        [filteredCategoriesList, categoryFilter]
    )

    const title = t('pages.photos.title', 'Астрофото')

    // Derive filters from router.query (not just the initial SSR props) so
    // shallow-routed URL updates and Back/Forward navigation stay in sync.
    useEffect(() => {
        const queryCategory = router.query.category as string | undefined

        setCategoryFilter(queryCategory ? parseInt(queryCategory) : undefined)
    }, [router.query.category])

    useEffect(() => {
        const querySearch = (router.query.search as string) || undefined

        setSearchFilter(querySearch)
        setDebouncedSearchFilter(querySearch)
    }, [router.query.search])

    // Sync filters to the URL (shallow - filtering is client-side, no need to
    // re-run getServerSideProps).
    useEffect(() => {
        const currentSearch = (router.query.search as string) || undefined
        const currentCategory = router.query.category ? parseInt(router.query.category as string) : undefined

        if (currentSearch === debouncedSearchFilter && currentCategory === categoryFilter) {
            return
        }

        const query: Record<string, string | number> = {}

        if (debouncedSearchFilter) {
            query.search = debouncedSearchFilter
        }
        if (categoryFilter !== undefined) {
            query.category = categoryFilter
        }

        void router.push({ pathname: router.pathname, query }, undefined, { shallow: true })
    }, [debouncedSearchFilter, categoryFilter, router.query.search, router.query.category])

    return (
        <AppLayout
            canonical={'photos'}
            title={`${title}${categoryFilter ? `: ${currentCategory?.title}` : ''}`}
            description={[
                t(
                    'pages.photos.description',
                    'Коллекция астрофотографий галактик, звёздных скоплений, туманностей, планет и других космических объектов, запечатленных любительской обсерваторией. Найдите и отфильтруйте изображения по категориям и параметрам, чтобы увидеть уникальные снимки Вселенной с деталями по каждому фильтру и выдержке.'
                ),
                currentCategory?.description
            ]
                .filter(Boolean)
                .join(' ')}
            openGraph={{
                images: [
                    {
                        height: 755,
                        url: '/screenshots/photos.jpg',
                        width: 1280
                    }
                ]
            }}
        >
            <AppToolbar
                title={`${title}${categoryFilter ? `: ${currentCategory?.title}` : ''}`}
                currentPage={categoryFilter ? currentCategory?.title : title}
                links={
                    categoryFilter
                        ? [
                              {
                                  link: '/photos',
                                  text: title
                              }
                          ]
                        : undefined
                }
            >
                <Input
                    clearable={true}
                    value={searchFilter}
                    placeholder={t('pages.photos.search-by-object', 'Поиск по объекту')}
                    onChange={(e) => setSearchFilter(e.target.value)}
                />

                <Select<number>
                    clearable={true}
                    value={categoryFilter}
                    placeholder={t('pages.photos.filter-by-category', 'Фильтр по категории')}
                    onSelect={(category) => setCategoryFilter(category?.[0]?.key)}
                    options={filteredCategoriesList?.map((category) => ({
                        key: category.id,
                        value: category.title
                    }))}
                />

                {hasPermission(user, ApiModel.Permission.PHOTOS_MANAGE) && (
                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        label={t('pages.photos.create_button', 'Добавить')}
                        link={'/photos/form'}
                    />
                )}
            </AppToolbar>

            <PhotoGrid photosList={filteredPhotosList} />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<PhotosPageProps>> => {
            const locale = context.locale ?? 'en'
            const search = (context.query.search as string) || ''
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            const { data: photos } = await store.dispatch(API.endpoints?.photosGetList.initiate())

            const { data: categories } = await store.dispatch(API.endpoints?.categoriesGetList.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    search,
                    photosList: photos?.items || [],
                    categoriesList: categories?.items || []
                }
            }
        }
)

export default PhotosPage
