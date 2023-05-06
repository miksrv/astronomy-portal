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
import { NextSeo } from 'next-seo'
import React, { useMemo, useState } from 'react'
import { Message } from 'semantic-ui-react'

import PhotoCategorySwitcher from '@/components/photo-category-switcher'
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

type TPhotoCategory = TPhoto & { category: number }

const Photos: React.FC = () => {
    const [filterCategory, setFilterCategory] = useState<number>(0)

    const { data: statisticData } = useStatisticGetQuery()
    const { data: categoriesData } = useCategoryGetListQuery()
    const { data: photoData, isLoading, isError } = usePhotoGetListQuery()
    const { data: catalogData } = useCatalogGetListQuery()

    const listPhotos: TPhotoCategory[] | undefined = useMemo(
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

    const listFilteredPhotos: TPhotoCategory[] | undefined = useMemo(
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
