import { API, ApiModel, useAppSelector } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import uniq from 'lodash-es/uniq'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import React, { useMemo, useState } from 'react'
import { Button, Dropdown } from 'simple-react-ui-kit'

import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import ObjectTable from '@/components/objects-table'

interface ObjectsPageProps {
    categoriesList: ApiModel.Category[]
    objectsList: ApiModel.Object[]
    photosList: ApiModel.Photo[]
}

// TODO В toolbar добавить быстрый поиск по названию объекта
const ObjectsPage: NextPage<ObjectsPageProps> = ({
    categoriesList,
    objectsList,
    photosList
}) => {
    const { t, i18n } = useTranslation()
    const router = useRouter()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const [categoryFilter, setCategoryFilter] = useState<number | undefined>()

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
            objectsList?.filter(({ categories }) =>
                categoryFilter ? categories?.includes(categoryFilter) : true
            ),
        [objectsList, categoryFilter]
    )

    return (
        <AppLayout>
            <NextSeo
                title={t('list-astronomical-objects')}
                description={t('description-object-list-page')}
                openGraph={{
                    // images: [
                    //     {
                    //         height: 814,
                    //         url: '/screenshots/objects.jpg',
                    //         width: 1280
                    //     }
                    // ],
                    siteName: t('look-at-the-stars'),
                    title: t('list-astronomical-objects'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('list-astronomical-objects')}
                currentPage={t('list-astronomical-objects')}
            >
                <Dropdown<number>
                    clearable={true}
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
                        label={t('add')}
                        onClick={handleCreate}
                    />
                )}
            </AppToolbar>

            <ObjectTable
                objectsList={filteredObjectsList}
                photosList={photosList}
            />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<ObjectsPageProps>> => {
            const locale = context.locale ?? 'en'
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
                    categoriesList: categories?.items || [],
                    objectsList: objects?.items || [],
                    photosList: photos?.items || []
                }
            }
        }
)

export default ObjectsPage
