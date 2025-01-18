import { API, ApiModel, useAppSelector } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { formatObjectName } from '@/tools/strings'
import uniq from 'lodash-es/uniq'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import React, { useMemo, useState } from 'react'
import { Button, Dropdown, Input } from 'simple-react-ui-kit'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import PhotoGrid from '@/components/photo-grid'

interface PhotosPageProps {
    photosList: ApiModel.Photo[]
    categoriesList: ApiModel.Category[]
}

const PhotosPage: NextPage<PhotosPageProps> = ({
    photosList,
    categoriesList
}) => {
    const { t, i18n } = useTranslation()
    const router = useRouter()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const [searchFilter, setSearchFilter] = useState<string>()
    const [categoryFilter, setCategoryFilter] = useState<number | undefined>()

    const handleCreate = () => {
        router.push('/photos/form')
    }

    const filteredCategoriesList = useMemo(
        () =>
            categoriesList?.filter(({ id }) =>
                uniq(
                    photosList?.flatMap(({ categories }) => categories)
                )?.includes(id)
            ),
        [categoriesList, photosList]
    )

    const filteredPhotosList = useMemo(
        () =>
            photosList
                ?.filter(({ categories }) =>
                    categoryFilter ? categories?.includes(categoryFilter) : true
                )
                ?.filter(({ objects }) =>
                    searchFilter
                        ? objects
                              ?.flatMap((name) => formatObjectName(name))
                              ?.join('')
                              ?.toLowerCase()
                              .includes(searchFilter.toLowerCase())
                        : true
                )
                ?.sort(
                    (a, b) =>
                        new Date(b?.date || '').getTime() -
                        new Date(a?.date || '').getTime()
                ),
        [photosList, categoryFilter, searchFilter]
    )

    return (
        <AppLayout>
            <NextSeo
                title={t('astrophoto')}
                description={t('description-photos-list-page')}
                openGraph={{
                    images: [
                        {
                            height: 755,
                            url: '/screenshots/photos.jpg',
                            width: 1280
                        }
                    ],
                    siteName: t('look-at-the-stars'),
                    title: t('astrophoto'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('astrophoto')}
                currentPage={t('astrophoto')}
            >
                <Input
                    placeholder={t('search-by-object')}
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                />

                <Dropdown<number>
                    clearable={true}
                    size={'medium'}
                    value={categoryFilter}
                    placeholder={t('filter-by-category')}
                    onSelect={(category) => setCategoryFilter(category?.key)}
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

            <PhotoGrid photosList={filteredPhotosList} />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<PhotosPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            const { data: photos } = await store.dispatch(
                API.endpoints?.photosGetList.initiate()
            )

            const { data: categories } = await store.dispatch(
                API.endpoints?.categoriesGetList.initiate()
            )

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    photosList: photos?.items || [],
                    categoriesList: categories?.items || []
                }
            }
        }
)

export default PhotosPage
