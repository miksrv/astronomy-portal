import {
    catalogGetItem,
    getRunningQueriesThunk,
    photoGetList,
    statisticGetCatalogItems,
    useCatalogGetItemQuery,
    usePhotoGetListQuery,
    useStatisticGetCatalogItemsQuery
} from '@/api/api'
import { hosts } from '@/api/constants'
import { wrapper } from '@/api/store'
import { isOutdated, sliceText } from '@/functions/helpers'
import { skipToken } from '@reduxjs/toolkit/query'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/dist/client/router'
import React, { useMemo } from 'react'
import { Grid, Message } from 'semantic-ui-react'

import Coordinates from '@/components/charts/Coordinates'
import Deviation from '@/components/charts/Deviation'
import FilesQuality from '@/components/charts/FilesQuality'
import FilesTable from '@/components/files-table'
import ObjectCloud from '@/components/object-cloud'
import ObjectSection from '@/components/objects-section'
import PhotoTable from '@/components/photo-table'

// Only if we build application as static HTML
// export const getStaticPaths = async () => {
//     const storeObject = store()
//     const result = await storeObject.dispatch(
//         statisticGetCatalogItems.initiate()
//     )
//
//     return {
//         fallback: false,
//         paths: result.data?.items.map((name) => `/objects/${name}`)
//     }
// }

export const getServerSideProps = wrapper.getServerSideProps(
    (store) => async (context) => {
        const name = context.params?.name

        if (typeof name === 'string') {
            await store.dispatch(statisticGetCatalogItems.initiate())
            const catalog: any = await store.dispatch(
                catalogGetItem.initiate(name)
            )
            const photos: any = await store.dispatch(
                photoGetList.initiate({ object: name })
            )

            await Promise.all(store.dispatch(getRunningQueriesThunk()))

            if (catalog.error?.status === 404 || photos.error?.status === 404) {
                return { notFound: true }
            }

            return { props: {} }
        }

        return { notFound: true }
    }
)

const ObjectItemPage: NextPage = () => {
    const router = useRouter()
    const routerObject = router.query.name
    const objectName =
        typeof routerObject === 'string' ? routerObject : skipToken

    const { data: photoList, isLoading: photoLoading } = usePhotoGetListQuery(
        { object: typeof objectName === 'string' ? objectName : '' },
        {
            skip: router.isFallback
        }
    )

    const {
        data: catalogData,
        isLoading: catalogLoading,
        isError: catalogError
    } = useCatalogGetItemQuery(objectName, {
        skip: router.isFallback
    })

    const { data: catalogObjects, isLoading: objectsLoading } =
        useStatisticGetCatalogItemsQuery()

    const objectTitle = useMemo(
        () => catalogData?.title || catalogData?.name || objectName.toString(),
        [catalogData, objectName]
    )

    const filesSorted = useMemo(
        () =>
            [...(catalogData?.files || [])]?.sort(
                (a, b) =>
                    new Date(a.date_obs).getTime() -
                    new Date(b.date_obs).getTime()
            ),
        [catalogData?.files]
    )

    const deviationRa: number = useMemo(() => {
        if (!catalogData?.files?.length) {
            return 0
        }

        const max = Math.max.apply(
            null,
            catalogData?.files?.map(({ ra }) => ra) || []
        )
        const min = Math.min.apply(
            null,
            catalogData?.files?.map(({ ra }) => ra) || []
        )

        return Math.round((max - min) * 100) / 100
    }, [catalogData?.files])

    const deviationDec: number = useMemo(() => {
        if (!catalogData?.files?.length) {
            return 0
        }

        const max = Math.max.apply(
            null,
            catalogData?.files?.map(({ dec }) => dec) || []
        )
        const min = Math.min.apply(
            null,
            catalogData?.files?.map(({ dec }) => dec) || []
        )

        return Math.round((max - min) * 100) / 100
    }, [catalogData?.files])

    return (
        <main>
            <NextSeo
                title={`${objectTitle} - Объект`}
                description={
                    'Описание объекта наблюдения: ' +
                    sliceText(catalogData?.text ?? '', 200)
                }
                openGraph={{
                    images: [
                        {
                            height: 244,
                            url: catalogData?.image
                                ? `${hosts.maps}${catalogData?.image}`
                                : 'images/no-photo.png',
                            width: 487
                        }
                    ],
                    locale: 'ru'
                }}
            />
            <ObjectSection
                title={objectTitle}
                loader={catalogLoading}
                error={catalogError}
                catalog={catalogData}
                deviationRa={deviationRa}
                deviationDec={deviationDec}
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
            {catalogData?.text && (
                <div className={'section box textBlock'}>
                    {catalogData?.text}
                </div>
            )}
            <PhotoTable
                photos={photoList?.items}
                loader={photoLoading}
            />
            {!!catalogData?.files?.length && (
                <Grid className={'section'}>
                    <Grid.Column
                        computer={6}
                        tablet={16}
                        mobile={16}
                        style={{ paddingBottom: '0' }}
                    >
                        <Deviation files={filesSorted} />
                    </Grid.Column>
                    <Grid.Column
                        computer={10}
                        tablet={16}
                        mobile={16}
                        style={{ paddingBottom: '0' }}
                    >
                        <Coordinates files={filesSorted} />
                    </Grid.Column>
                    {!!filesSorted?.filter(
                        ({ star_count, hfr }) => star_count && hfr
                    ).length && (
                        <Grid.Column
                            width={16}
                            style={{ paddingBottom: '0' }}
                        >
                            <FilesQuality files={filesSorted} />
                        </Grid.Column>
                    )}
                </Grid>
            )}
            <FilesTable
                loader={catalogLoading}
                objectName={typeof objectName === 'string' ? objectName : ''}
                files={catalogData?.files}
            />
            <ObjectCloud
                loader={objectsLoading}
                current={typeof objectName === 'string' ? objectName : ''}
                names={catalogObjects?.items}
                link={'objects'}
            />
        </main>
    )
}

export default ObjectItemPage
