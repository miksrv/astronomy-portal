import {
    getCatalogItem,
    getPhotoList,
    getRunningQueriesThunk,
    useGetCatalogItemQuery,
    useGetPhotoListItemQuery,
    useGetPhotoListQuery
} from '@/api/api'
import { store, wrapper } from '@/api/store'
import { TPhoto } from '@/api/types'
import { skipToken } from '@reduxjs/toolkit/query'
import { GetStaticProps } from 'next'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/dist/client/router'
import React from 'react'

import ObjectCloud from '@/components/object-cloud'
import PhotoSection from '@/components/photo-section'
import PhotoTable from '@/components/photo-table'

export const getStaticPaths = async () => {
    const storeObject = store()
    const result = await storeObject.dispatch(getPhotoList.initiate())

    return {
        fallback: false,
        paths: result.data?.payload.map((item) => `/photos/${item.object}`)
    }
}

export const getStaticProps: GetStaticProps = wrapper.getStaticProps(
    (store) => async (context) => {
        const name = context.params?.name

        if (typeof name === 'string') {
            store.dispatch(getCatalogItem.initiate(name))
            store.dispatch(getPhotoList.initiate({}))
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

    const { data: dataCatalog, isLoading: loadingCatalog } =
        useGetCatalogItemQuery(objectName, { skip: router.isFallback })
    const { data: dataPhotosItem, isFetching: loadingPhotosItem } =
        useGetPhotoListItemQuery(objectName, { skip: router.isFallback })
    const { data: dataPhotosList, isLoading: loadingPhotosList } =
        useGetPhotoListQuery({}, { skip: router.isFallback })

    const currentPhoto: TPhoto | undefined = React.useMemo(() => {
        const searchPhoto =
            dataPhotosItem?.payload &&
            photoDate &&
            dataPhotosItem?.payload.filter((photo) => photo.date === photoDate)

        return searchPhoto && searchPhoto.length
            ? searchPhoto.pop()
            : dataPhotosItem?.payload?.[0]
    }, [dataPhotosItem, photoDate])

    const listPhotoNames: string[] = React.useMemo(() => {
        return dataPhotosList?.payload.length
            ? dataPhotosList.payload
                  .map((item) => item.object)
                  .filter(
                      (item, index, self) =>
                          item !== '' && self.indexOf(item) === index
                  )
            : []
    }, [dataPhotosList])

    const photoTitle = React.useMemo(
        () =>
            dataCatalog?.payload
                ? dataCatalog.payload?.title || dataCatalog.payload.name
                : currentPhoto?.object || objectName.toString(),
        [dataCatalog, objectName, currentPhoto]
    )

    return (
        <main>
            <NextSeo
                title={`${photoTitle} - Фотографии астрономического объекта`}
                description={dataCatalog?.payload?.text
                    .replace(/(\r\n|\n|\r)/gm, '')
                    .slice(0, 200)}
                openGraph={{
                    images: [
                        {
                            height: 743,
                            url: `${process.env.NEXT_PUBLIC_API_HOST}public/photo/${currentPhoto?.file}_thumb.${currentPhoto?.ext}`,
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />
            <PhotoSection
                loader={loadingPhotosItem || loadingCatalog}
                title={photoTitle}
                photo={currentPhoto}
                catalog={dataCatalog?.payload}
            />
            {!!dataPhotosItem?.payload.length && (
                <>
                    <br />
                    <PhotoTable photos={dataPhotosItem?.payload} />
                </>
            )}
            <br />
            <ObjectCloud
                loader={loadingPhotosList}
                current={typeof objectName === 'string' ? objectName : ''}
                names={listPhotoNames}
                link={'photos'}
            />
        </main>
    )
}

export default Photo
