import {
    getCatalogList,
    getPhotoList,
    getRunningQueriesThunk,
    useGetCatalogListQuery,
    useGetCategoriesListQuery,
    useGetPhotoListQuery,
    useGetStatisticQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { TPhoto } from '@/api/types'
import { NextSeo } from 'next-seo'
import React from 'react'
import { Message } from 'semantic-ui-react'

import PhotoCategorySwitcher from '@/components/photo-category-switcher'
import PhotoGrid from '@/components/photo-grid'

export const getStaticProps = wrapper.getStaticProps((store) => async () => {
    store.dispatch(getCatalogList.initiate())
    store.dispatch(getPhotoList.initiate())

    await Promise.all(store.dispatch(getRunningQueriesThunk()))

    return {
        props: { object: {} }
    }
})

type TPhotoCategory = TPhoto & { category: number }

const Photos: React.FC = () => {
    const [filterCategory, setFilterCategory] = React.useState<number>(0)

    const { data: statisticData } = useGetStatisticQuery()
    const { data: categoriesData } = useGetCategoriesListQuery()
    const { data: photoData, isLoading, isError } = useGetPhotoListQuery()
    const { data: catalogData } = useGetCatalogListQuery()

    const listPhotos: TPhotoCategory[] | undefined = React.useMemo(
        () =>
            photoData?.items.map((photo) => {
                const catalogItem = catalogData?.items.find(
                    ({ name }) => name === photo.object
                )

                return {
                    ...photo,
                    category: catalogItem?.category || 0
                }
            }),
        [photoData, catalogData]
    )

    const listFilteredPhotos: TPhotoCategory[] | undefined = React.useMemo(
        () =>
            listPhotos?.filter(
                ({ category }) => !filterCategory || category === filterCategory
            ),
        [filterCategory, listPhotos]
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
            <PhotoCategorySwitcher
                active={filterCategory}
                categories={categoriesData?.items}
                onSelectCategory={setFilterCategory}
            />
            <PhotoGrid
                threeColumns={true}
                loading={isLoading}
                loaderCount={statisticData?.photos_count || 12}
                photos={listFilteredPhotos}
                catalog={catalogData?.items}
            />
        </main>
    )
}

export default Photos
