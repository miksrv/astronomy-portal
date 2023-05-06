import {
    catalogGetItem,
    getRunningQueriesThunk,
    photoGetList,
    statisticGetPhotosItems,
    useCatalogGetItemQuery,
    usePhotoGetListQuery,
    useStatisticGetPhotosItemsQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { TPhoto } from '@/api/types'
import { isOutdated } from '@/functions/helpers'
import { skipToken } from '@reduxjs/toolkit/query'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/dist/client/router'
import React, { useMemo } from 'react'
import { Message } from 'semantic-ui-react'

import ObjectCloud from '@/components/object-cloud'
import PhotoSection from '@/components/photo-section'
import PhotoTable from '@/components/photo-table'

// Only if we build application as static HTML
// export const getStaticPaths = async () => {
//     const storeObject = store()
//     const result = await storeObject.dispatch(
//         statisticGetPhotosItems.initiate()
//     )
//
//     return {
//         fallback: false,
//         paths: result.data?.items.map((name) => `/photos/${name}`)
//     }
// }

export const getServerSideProps = wrapper.getServerSideProps(
    (store) => async (context) => {
        const name = context.params?.name

        if (typeof name === 'string') {
            store.dispatch(catalogGetItem.initiate(name))
            store.dispatch(photoGetList.initiate({ object: name }))
            store.dispatch(statisticGetPhotosItems.initiate())
        }

        await Promise.all(store.dispatch(getRunningQueriesThunk()))

        return {
            props: {}
        }
    }
)

const Photo: React.FC = () => {
    const router = useRouter()
    const routerObject = router.query.name
    const photoDate = router.query.date
    const objectName =
        typeof routerObject === 'string' ? routerObject : skipToken

    const {
        data: catalogData,
        isLoading: catalogLoading,
        isError: catalogError
    } = useCatalogGetItemQuery(objectName, {
        skip: router.isFallback
    })

    const { data: photoList, isLoading: photoListLoading } =
        usePhotoGetListQuery(
            { object: typeof objectName === 'string' ? objectName : '' },
            {
                skip: router.isFallback
            }
        )

    const { data: photoObjects, isLoading: objectsLoading } =
        useStatisticGetPhotosItemsQuery()

    const photoItem: TPhoto | undefined = useMemo(
        () =>
            photoList?.items.find(({ date }) => date === photoDate) ||
            photoList?.items?.[0],
        [photoList, photoDate]
    )

    const objectTitle = useMemo(
        () => catalogData?.title || catalogData?.name || objectName.toString(),
        [catalogData, objectName]
    )

    return (
        <main>
            <NextSeo
                title={objectTitle}
                description={catalogData?.text
                    .replace(/(\r\n|\n|\r)/gm, '')
                    .slice(0, 200)}
                openGraph={{
                    images: [
                        {
                            height: 743,
                            url: `${process.env.NEXT_PUBLIC_API_HOST}photos/${photoItem?.image_name}_thumb.${photoItem?.image_ext}`,
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />
            <PhotoSection
                loader={photoListLoading || catalogLoading}
                title={objectTitle}
                error={catalogError}
                photo={photoItem}
                catalog={catalogData}
            />
            <Message
                warning={true}
                hidden={
                    !isOutdated(
                        photoList?.items?.[0].date!,
                        catalogData?.updated!
                    )
                }
                className={'section'}
                icon={'warning sign'}
                header={'Новые данные'}
                content={
                    'Фотографии устарели - есть новые данные с телескопа, с помощью которых можно собрать новое изображение объекта'
                }
            />
            <PhotoTable
                photos={photoList?.items}
                loader={photoListLoading}
            />
            <ObjectCloud
                loader={objectsLoading}
                current={typeof objectName === 'string' ? objectName : ''}
                names={photoObjects?.items}
                link={'photos'}
            />
        </main>
    )
}

export default Photo
