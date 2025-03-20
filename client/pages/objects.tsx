import { API, ApiModel, SITE_LINK, useAppSelector } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { formatObjectName } from '@/tools/strings'
import uniq from 'lodash-es/uniq'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Dropdown, Input } from 'simple-react-ui-kit'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import ObjectTable from '@/components/objects-table'

interface ObjectsPageProps {
    category: string
    categoriesList: ApiModel.Category[]
    objectsList: ApiModel.Object[]
    photosList: ApiModel.Photo[]
}

const ObjectsPage: NextPage<ObjectsPageProps> = ({
    category,
    categoriesList,
    objectsList,
    photosList
}) => {
    const { t, i18n } = useTranslation()
    const router = useRouter()

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const [searchFilter, setSearchFilter] = useState<string>()
    const [categoryFilter, setCategoryFilter] = useState<number | undefined>()
    const [toolbarHeight, setToolbarHeight] = useState<number>(0)
    const [footerHeight, setFooterHeight] = useState<number>(0)

    const toolbarRef = useRef<HTMLDivElement>(null)
    const footerRef = useRef<HTMLDivElement>(null)

    const handleCreate = () => {
        router.push('/objects/form')
    }

    const filteredCategoriesList = useMemo(
        () =>
            categoriesList?.filter(({ id }) =>
                uniq(
                    objectsList?.flatMap(({ categories }) => categories)
                )?.includes(id)
            ),
        [categoriesList, objectsList]
    )

    const filteredObjectsList = useMemo(
        () =>
            objectsList
                ?.filter(({ categories }) =>
                    categoryFilter ? categories?.includes(categoryFilter) : true
                )
                ?.filter(({ name, title }) =>
                    searchFilter
                        ? formatObjectName(name)
                              ?.toLowerCase()
                              .includes(searchFilter.toLowerCase()) ||
                          title
                              ?.toLowerCase()
                              .includes(searchFilter.toLowerCase())
                        : true
                ),
        [objectsList, categoryFilter, searchFilter]
    )

    const currentCategory = useMemo(
        () => filteredCategoriesList?.find(({ id }) => id === categoryFilter),
        [filteredCategoriesList, categoryFilter]
    )

    const title =
        t('list-astronomical-objects') +
        (categoryFilter ? `: ${currentCategory?.title}` : '')

    const handleChangeCategoryFilter = (category: number | undefined) => {
        if (category !== undefined) {
            router.push({
                pathname: router.pathname,
                query: { ...router.query, category }
            })
        } else {
            const { ...rest } = router.query
            router.push({
                pathname: router.pathname,
                query: rest
            })
        }

        setCategoryFilter(category)
    }

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

    useEffect(() => {
        setCategoryFilter(category ? parseInt(category) : undefined)
    }, [category])

    return (
        <AppLayout>
            <NextSeo
                title={title}
                description={`${t('description-object-list-page')} ${
                    currentCategory?.description
                }`}
                canonical={`${canonicalUrl}objects`}
                openGraph={{
                    images: [
                        {
                            height: 773,
                            url: '/screenshots/objects.jpg',
                            width: 1280
                        }
                    ],
                    siteName: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                ref={toolbarRef}
                title={title}
                currentPage={
                    categoryFilter
                        ? currentCategory?.title
                        : t('list-astronomical-objects')
                }
                links={
                    categoryFilter
                        ? [
                              {
                                  link: '/objects',
                                  text: t('list-astronomical-objects')
                              }
                          ]
                        : undefined
                }
            >
                <Input
                    placeholder={t('search-by-name')}
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                />

                <Dropdown<number>
                    size={'medium'}
                    clearable={true}
                    value={categoryFilter}
                    placeholder={t('filter-by-category')}
                    onSelect={(category) =>
                        handleChangeCategoryFilter(category?.key)
                    }
                    options={filteredCategoriesList?.map((category) => ({
                        key: category.id,
                        value: category.title
                    }))}
                />

                {userRole === 'admin' && (
                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        size={'medium'}
                        label={t('add')}
                        onClick={handleCreate}
                    />
                )}
            </AppToolbar>

            <ObjectTable
                objectsList={filteredObjectsList}
                photosList={photosList}
                combinedHeight={toolbarHeight + footerHeight + 95}
            />

            <AppFooter ref={footerRef} />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<ObjectsPageProps>> => {
            const locale = context.locale ?? 'en'
            const category = (context.query.category as string) || ''
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            const { data: photos } = await store.dispatch(
                API.endpoints?.photosGetList.initiate()
            )

            const { data: objects } = await store.dispatch(
                API.endpoints?.objectsGetList.initiate()
            )

            const { data: categories } = await store.dispatch(
                API.endpoints?.categoriesGetList.initiate()
            )

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    category,
                    categoriesList: categories?.items || [],
                    objectsList: objects?.items || [],
                    photosList: photos?.items || []
                }
            }
        }
)

export default ObjectsPage
