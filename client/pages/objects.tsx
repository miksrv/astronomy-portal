import React, { useEffect, useMemo, useRef, useState } from 'react'
import uniq from 'lodash-es/uniq'
import { Button, Dropdown, Input } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, setLocale, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { ObjectsTable } from '@/components/pages/objects'
import { formatObjectName } from '@/utils/strings'

interface ObjectsPageProps {
    category: string
    categoriesList: ApiModel.Category[]
    objectsList: ApiModel.Object[]
    photosList: ApiModel.Photo[]
}

const ObjectsPage: NextPage<ObjectsPageProps> = ({ category, categoriesList, objectsList, photosList }) => {
    const { t } = useTranslation()
    const router = useRouter()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const [searchFilter, setSearchFilter] = useState<string>()
    const [categoryFilter, setCategoryFilter] = useState<number | undefined>()
    const [toolbarHeight, setToolbarHeight] = useState<number>(0)
    const [footerHeight, setFooterHeight] = useState<number>(0)

    const toolbarRef = useRef<HTMLDivElement>(null)
    const footerRef = useRef<HTMLDivElement>(null)

    const handleCreate = async () => {
        await router.push('/objects/form')
    }

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

    const title = t('pages.objects.title', { defaultValue: 'Список астрономических объектов' })

    const handleChangeCategoryFilter = async (category: number | undefined) => {
        if (category !== undefined) {
            await router.push({
                pathname: router.pathname,
                query: { ...router.query, category }
            })
        } else {
            await router.push({
                pathname: router.pathname,
                query: undefined
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
        <AppLayout
            canonical={'objects'}
            title={`${title}${categoryFilter ? `: ${currentCategory?.title}` : ''}`}
            description={`${t('pages.objects.description', { defaultValue: 'Каталог астрономических объектов, отснятых обсерваторией: галактики, туманности, астероиды и кометы. Таблица с объектами включает информацию о суммарной выдержке, наличии обработанных фото и данных по каждому фильтру: Luminance, Red, Green, Blue, Ha, OIII, SII. Узнайте больше о каждом объекте и деталях наблюдения, проведенных обсерваторией.' })} ${currentCategory?.description}`}
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
                    size={'large'}
                    placeholder={t('pages.objects.search-by-name', { defaultValue: 'Поиск по названию' })}
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                />

                <Dropdown<number>
                    size={'large'}
                    mode={'secondary'}
                    clearable={true}
                    value={categoryFilter}
                    placeholder={t('pages.objects.filter-by-category', { defaultValue: 'Фильтр по категории' })}
                    onSelect={(category) => handleChangeCategoryFilter(category?.key)}
                    options={filteredCategoriesList?.map((category) => ({
                        key: category.id,
                        value: category.title
                    }))}
                />

                {userRole === ApiModel.UserRole.ADMIN && (
                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        size={'large'}
                        label={t('pages.objects.create_button', { defaultValue: 'Создать объект' })}
                        onClick={handleCreate}
                    />
                )}
            </AppToolbar>

            <ObjectsTable
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
        async (context): Promise<GetServerSidePropsResult<ObjectsPageProps>> => {
            const locale = context.locale ?? 'en'
            const category = (context.query.category as string) || ''
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            const { data: photos } = await store.dispatch(API.endpoints?.photosGetList.initiate())

            const { data: objects } = await store.dispatch(API.endpoints?.objectsGetList.initiate())

            const { data: categories } = await store.dispatch(API.endpoints?.categoriesGetList.initiate())

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
