import {
    catalogGetList,
    categoryGetList,
    getRunningQueriesThunk,
    photoGetList,
    useCatalogGetListQuery,
    useCategoryGetListQuery,
    usePhotoGetListQuery,
    useStatisticGetQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { TPhoto } from '@/api/types'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useMemo, useState } from 'react'
import { Message } from 'semantic-ui-react'

import CatalogToolbar from '@/components/catalog-toolbar'
import PhotoGrid from '@/components/photo-grid'

export const getServerSideProps = wrapper.getServerSideProps(
    (store) => async () => {
        store.dispatch(catalogGetList.initiate())
        store.dispatch(categoryGetList.initiate())
        store.dispatch(photoGetList.initiate())

        await Promise.all(store.dispatch(getRunningQueriesThunk()))

        return {
            props: { object: {} }
        }
    }
)

const PhotosPage: NextPage = () => {
    const [search, setSearch] = useState<string>('')
    const [categories, setCategories] = useState<number[]>([])

    const { data: statisticData } = useStatisticGetQuery()
    const { data: categoriesData } = useCategoryGetListQuery()
    const { data: photoData, isLoading, isError } = usePhotoGetListQuery()
    const { data: catalogData } = useCatalogGetListQuery()

    const listPhotos: TPhoto[] | undefined = useMemo(
        () =>
            photoData?.items?.filter((photo) => {
                const catalogItem = catalogData?.items?.find(
                    ({ name }) => name === photo.object
                )

                return (
                    (search === '' ||
                        catalogItem?.name
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                        catalogItem?.title
                            ?.toLowerCase()
                            .includes(search.toLowerCase())) &&
                    (!categories?.length ||
                        (catalogItem?.category &&
                            categories.includes(catalogItem.category)))
                )
            }),
        [photoData, catalogData, categories, search]
    )

    return (
        <main>
            <NextSeo
                title={'Астрофотографии'}
                description={
                    'Астрофотографии галактик, звезд, планет и других космических объектов, сделанных с помощью любительского телескопа'
                }
                openGraph={{
                    images: [
                        {
                            height: 743,
                            url: '/screenshots/photos.jpg',
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />
            {isError && !photoData?.items.length && (
                <Message
                    error={true}
                    content={
                        'Возникла ошибка при получении списка отснятых объектов'
                    }
                />
            )}
            <CatalogToolbar
                search={search}
                categories={categoriesData?.items}
                onChangeSearch={setSearch}
                onChangeCategories={setCategories}
            />
            <PhotoGrid
                threeColumns={true}
                loading={isLoading}
                loaderCount={statisticData?.photos || 12}
                photos={listPhotos}
                catalog={catalogData?.items}
            />
        </main>
    )
}

export default PhotosPage
