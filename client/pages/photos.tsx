import { api } from '@/api/api'
import { wrapper } from '@/api/store'
import { TCatalog, TCategory, TPhoto } from '@/api/types'
import { GetServerSidePropsResult, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useMemo, useState } from 'react'

import CatalogToolbar from '@/components/catalog-toolbar'
import PhotoGrid from '@/components/photo-grid'

interface PhotosPageProps {
    catalog: TCatalog[]
    categories: TCategory[]
    photos: TPhoto[]
}

const PhotosPage: NextPage<PhotosPageProps> = ({
    catalog,
    categories,
    photos
}) => {
    const [search, setSearch] = useState<string>('')
    const [localCategories, setLocalCategories] = useState<number[]>([])

    const listPhotos: TPhoto[] | undefined = useMemo(
        () =>
            photos?.filter((photo) => {
                const catalogItem = catalog?.find(
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
                    (!localCategories?.length ||
                        (catalogItem?.category &&
                            localCategories.includes(catalogItem.category)))
                )
            }),
        [photos, catalog, localCategories, search]
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
            <CatalogToolbar
                search={search}
                categories={categories}
                onChangeSearch={setSearch}
                onChangeCategories={setLocalCategories}
            />
            <PhotoGrid
                threeColumns={true}
                photos={listPhotos}
                catalog={catalog}
            />
        </main>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) => async (): Promise<GetServerSidePropsResult<PhotosPageProps>> => {
        const { data: catalog } = await store.dispatch(
            api.endpoints?.catalogGetList.initiate()
        )

        const { data: categories } = await store.dispatch(
            api.endpoints?.categoryGetList.initiate()
        )

        const { data: photos } = await store.dispatch(
            api.endpoints?.photoGetList.initiate()
        )

        await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()))

        return {
            props: {
                catalog: catalog?.items || [],
                categories: categories?.items || [],
                photos: photos?.items || []
            }
        }
    }
)

export default PhotosPage
