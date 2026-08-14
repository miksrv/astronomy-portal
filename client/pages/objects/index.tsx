import React, { useEffect, useMemo, useRef, useState } from 'react'
import uniq from 'lodash-es/uniq'
import { Button, Input, Select } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, ApiModel, setLocale, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { ObjectsTable } from '@/components/pages/objects'
import { hasPermission } from '@/utils/permissions'
import { formatObjectName } from '@/utils/strings'

interface ObjectsPageProps {
    search: string
    categoriesList: ApiModel.Category[]
    objectsList: ApiModel.Object[]
    photosList: ApiModel.Photo[]
}

const ObjectsPage: NextPage<ObjectsPageProps> = ({ search, categoriesList, objectsList, photosList }) => {
    const { t } = useTranslation()
    const router = useRouter()

    const user = useAppSelector((state) => state.auth?.user)

    const [searchFilter, setSearchFilter] = useState<string | undefined>(search || undefined)
    const [debouncedSearchFilter, setDebouncedSearchFilter] = useState<string | undefined>(search || undefined)
    const [categoryFilter, setCategoryFilter] = useState<number | undefined>()
    const [toolbarHeight, setToolbarHeight] = useState<number>(0)
    const [footerHeight, setFooterHeight] = useState<number>(0)

    const toolbarRef = useRef<HTMLDivElement>(null)
    const footerRef = useRef<HTMLDivElement>(null)

    const filteredCategoriesList = useMemo(
        () =>
            categoriesList?.filter(({ id }) =>
                uniq(objectsList?.flatMap(({ categories }) => categories))?.includes(id)
            ),
        [categoriesList, objectsList]
    )

    const filteredObjectsList = useMemo(
        () =>
            objectsList
                ?.filter(({ categories }) => (categoryFilter ? categories?.includes(categoryFilter) : true))
                ?.filter(({ name, title }) =>
                    searchFilter
                        ? formatObjectName(name)?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          title?.toLowerCase().includes(searchFilter.toLowerCase())
                        : true
                ),
        [objectsList, categoryFilter, searchFilter]
    )

    const currentCategory = useMemo(
        () => filteredCategoriesList?.find(({ id }) => id === categoryFilter),
        [filteredCategoriesList, categoryFilter]
    )

    const title = t('pages.objects.title', 'Список астрономических объектов')

    useEffect(() => {
        const updateHeights = () => {
            if (toolbarRef.current) {
                setToolbarHeight(toolbarRef.current.clientHeight)
            }
            if (footerRef.current) {
                setFooterHeight(footerRef.current.clientHeight)
            }
        }

        updateHeights()
        window.addEventListener('resize', updateHeights)

        return () => {
            window.removeEventListener('resize', updateHeights)
        }
    }, [])

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

    // Debounce the search input before syncing it to the URL - avoids pushing
    // a history entry on every keystroke.
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchFilter(searchFilter), 400)

        return () => clearTimeout(timer)
    }, [searchFilter])

    // Sync filters to the URL (shallow - filtering is client-side, no need to
    // re-run getServerSideProps). Keeps ?search= functional for direct links
    // and for the WebSite/SearchAction structured data on the home page.
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
            canonical={'objects'}
            title={`${title}${categoryFilter ? `: ${currentCategory?.title}` : ''}`}
            description={[
                t(
                    'pages.objects.description',
                    'Каталог астрономических объектов, отснятых обсерваторией: галактики, туманности, астероиды и кометы. Таблица с объектами включает информацию о суммарной выдержке, наличии обработанных фото и данных по каждому фильтру: Luminance, Red, Green, Blue, Ha, OIII, SII. Узнайте больше о каждом объекте и деталях наблюдения, проведенных обсерваторией.'
                ),
                currentCategory?.description
            ]
                .filter(Boolean)
                .join(' ')}
            openGraph={{
                images: [
                    {
                        height: 773,
                        url: '/screenshots/objects.jpg',
                        width: 1280
                    }
                ]
            }}
        >
            <AppToolbar
                ref={toolbarRef}
                title={`${title}${categoryFilter ? `: ${currentCategory?.title}` : ''}`}
                currentPage={categoryFilter ? currentCategory?.title : title}
                links={
                    categoryFilter
                        ? [
                              {
                                  link: '/objects',
                                  text: title
                              }
                          ]
                        : undefined
                }
            >
                <Input
                    clearable={true}
                    value={searchFilter}
                    placeholder={t('pages.objects.search-by-name', 'Поиск по названию')}
                    onChange={(e) => setSearchFilter(e.target.value)}
                />

                <Select<number>
                    clearable={true}
                    value={categoryFilter}
                    placeholder={t('pages.objects.filter-by-category', 'Фильтр по категории')}
                    onSelect={(category) => setCategoryFilter(category?.[0]?.key)}
                    options={filteredCategoriesList?.map((category) => ({
                        key: category.id,
                        value: category.title
                    }))}
                />

                {hasPermission(user, ApiModel.Permission.OBJECTS_MANAGE) && (
                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        label={t('pages.objects.create_button', 'Добавить')}
                        link={'/objects/form'}
                    />
                )}
            </AppToolbar>

            <ObjectsTable
                objectsList={filteredObjectsList}
                photosList={photosList}
                combinedHeight={toolbarHeight + footerHeight + 135}
            />

            <AppFooter ref={footerRef} />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<ObjectsPageProps>> => {
            const locale = context.locale ?? 'en'
            const search = (context.query.search as string) || ''
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            // Fetch a bounded set of photos — used only for object cover image thumbnails
            const { data: photos } = await store.dispatch(API.endpoints?.photosGetList.initiate())

            const { data: objects } = await store.dispatch(API.endpoints?.objectsGetList.initiate())

            const { data: categories } = await store.dispatch(API.endpoints?.categoriesGetList.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    search,
                    categoriesList: categories?.items || [],
                    objectsList: objects?.items || [],
                    photosList: photos?.items || []
                }
            }
        }
)

export default ObjectsPage
