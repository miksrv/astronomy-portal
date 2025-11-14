import React, { useEffect, useMemo, useState } from 'react'
import uniq from 'lodash-es/uniq'
import { Button, Input, Select } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, setLocale, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { PhotoGrid } from '@/components/pages/photos'
import { formatObjectName } from '@/utils/strings'

interface PhotosPageProps {
    category: string
    photosList: ApiModel.Photo[]
    categoriesList: ApiModel.Category[]
}

const PhotosPage: NextPage<PhotosPageProps> = ({ category, photosList, categoriesList }) => {
    const { t } = useTranslation()
    const router = useRouter()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const [searchFilter, setSearchFilter] = useState<string>()
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

    const handleCreate = async () => {
        await router.push('/photos/form')
    }

    useEffect(() => {
        setCategoryFilter(category ? parseInt(category) : undefined)
    }, [category])

    return (
        <AppLayout
            canonical={'photos'}
            title={`${title}${categoryFilter ? `: ${currentCategory?.title}` : ''}`}
            description={`${t('pages.photos.description', 'Коллекция астрофотографий галактик, звездных скоплений, туманностей, планет и других космических объектов, запечатленных любительской обсерваторией. Найдите и отфильтруйте изображения по категориям и параметрам, чтобы увидеть уникальные снимки Вселенной с деталями по каждому фильтру и выдержке.')} ${currentCategory?.description}`}
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
                    placeholder={t('pages.photos.search-by-object', 'Поиск по объекту')}
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                />

                <Select<number>
                    clearable={true}
                    value={categoryFilter}
                    placeholder={t('pages.photos.filter-by-category', 'Фильтр по категории')}
                    onSelect={(category) => handleChangeCategoryFilter(category?.[0]?.key)}
                    options={filteredCategoriesList?.map((category) => ({
                        key: category.id,
                        value: category.title
                    }))}
                />

                {userRole === ApiModel.UserRole.ADMIN && (
                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        label={t('pages.photos.create_button', 'Создать')}
                        onClick={handleCreate}
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
            const category = (context.query.category as string) || ''
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            const { data: photos } = await store.dispatch(API.endpoints?.photosGetList.initiate())

            const { data: categories } = await store.dispatch(API.endpoints?.categoriesGetList.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    category,
                    photosList: photos?.items || [],
                    categoriesList: categories?.items || []
                }
            }
        }
)

export default PhotosPage
