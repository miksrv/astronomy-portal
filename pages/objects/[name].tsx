import {
    getCatalogItem,
    getCatalogList,
    getObjectFiles,
    getObjectItem,
    getObjectNames,
    getPhotoList,
    getRunningQueriesThunk,
    useGetCatalogItemQuery,
    useGetObjectFilesQuery,
    useGetObjectItemQuery,
    useGetObjectNamesQuery,
    useGetPhotoListItemQuery
} from '@/api/api'
import { store, wrapper } from '@/api/store'
import { isOutdated } from '@/functions/helpers'
import { skipToken } from '@reduxjs/toolkit/query'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/dist/client/router'
import React from 'react'
import { Grid, Message } from 'semantic-ui-react'

import Chart from '@/components/chart'
import chart_coordinates from '@/components/chart/chart_coordinates'
import chart_coordlines from '@/components/chart/chart_coordlines'
import chart_statistic from '@/components/chart/chart_statistic'
import FilesTable from '@/components/files-table'
import ObjectCloud from '@/components/object-cloud'
import ObjectSection from '@/components/objects-section'
import PhotoTable from '@/components/photo-table'

export async function getStaticPaths() {
    const storeObject = store()
    const result = await storeObject.dispatch(getCatalogList.initiate())

    return {
        fallback: true,
        paths: result.data?.payload.map((item) => `/objects/${item.name}`)
    }
}

export const getStaticProps = wrapper.getStaticProps(
    (store) => async (context) => {
        const name = context.params?.name

        if (typeof name === 'string') {
            store.dispatch(getCatalogList.initiate())
            store.dispatch(getObjectNames.initiate())
            store.dispatch(getPhotoList.initiate(name))
            store.dispatch(getObjectItem.initiate(name))
            store.dispatch(getCatalogItem.initiate(name))
            store.dispatch(getObjectFiles.initiate(name))
            store.dispatch(getObjectFiles.initiate(name))
        }

        await Promise.all(store.dispatch(getRunningQueriesThunk()))

        return {
            props: { object: {} }
        }
    }
)

const Object: React.FC = () => {
    const router = useRouter()
    const routerObject = router.query.name
    const objectName =
        typeof routerObject === 'string' ? routerObject : skipToken

    const {
        data: dataObject,
        isFetching: objectLoading,
        isError
    } = useGetObjectItemQuery(objectName, { skip: router.isFallback })
    const { data: dataCatalog, isFetching: catalogLoading } =
        useGetCatalogItemQuery(objectName, { skip: router.isFallback })
    const { data: dataPhotos, isFetching: loadingPhotos } =
        useGetPhotoListItemQuery(objectName, {
            skip: router.isFallback
        })
    const { data: dataFiles, isFetching: fileLoading } = useGetObjectFilesQuery(
        objectName,
        { skip: router.isFallback }
    )
    const { data: dataNames, isFetching: namesLoading } =
        useGetObjectNamesQuery()

    const objectTitle = React.useMemo(
        () =>
            dataCatalog?.payload
                ? dataCatalog.payload?.title || dataCatalog.payload.name
                : objectName.toString(),
        [dataCatalog, objectName]
    )

    const chartData: [number, number][] = []
    const chartRa: number[] = []
    const chartDec: number[] = []
    const chartHFR: number[] = []
    const chartSNR: number[] = []

    let deviationRa: number = 0
    let deviationDec: number = 0

    if (isError) {
        return <div>Возникла ошибка на сервер</div>
    }

    if (dataObject?.status === false || dataCatalog?.status === false) {
        return <div>Что-то пошло не так, такого объекта нет</div>
    }

    if (dataFiles?.payload) {
        let middleRa = 0
        let middleDec = 0
        let counter = 0

        dataFiles.payload.forEach((item) => {
            middleRa += item.ra
            middleDec += item.dec
            counter += 1

            chartData.push([item.ra, item.dec])
            chartRa.push(item.ra)
            chartDec.push(item.dec)

            if (item.hfr !== 0) {
                chartHFR.push(item.hfr)
            }

            if (item.sky !== 0) {
                chartSNR.push(item.sky)
            }
        })

        deviationRa = Math.max(...chartRa) - Math.min(...chartRa)
        deviationDec = Math.max(...chartDec) - Math.min(...chartDec)

        chart_coordinates.xAxis.plotLines[0].value = middleRa / counter
        chart_coordinates.yAxis.plotLines[0].value = middleDec / counter
    }

    return (
        <main>
            <NextSeo
                title={`${objectTitle} - Данные астрономического объекта`}
                description={dataCatalog?.payload?.text}
                openGraph={{
                    images: [
                        {
                            height: 743,
                            url: `${process.env.NEXT_PUBLIC_API_HOST}public/photo/${dataPhotos?.payload?.[0].file}_thumb.${dataPhotos?.payload?.[0]?.ext}`,
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />
            <ObjectSection
                title={objectTitle}
                loader={objectLoading || catalogLoading}
                catalog={dataCatalog?.payload}
                object={dataObject?.payload}
                deviationRa={Math.round(deviationRa * 100) / 100}
                deviationDec={Math.round(deviationDec * 100) / 100}
            />
            {isOutdated(
                dataPhotos?.payload?.[0].date!,
                dataObject?.payload.date!
            ) ? (
                <Message
                    warning
                    icon={'warning sign'}
                    header={'Новые данные'}
                    content={
                        'Фотографии устарели - есть новые данные с телескопа, с помощью которых можно собрать новое изображение объекта'
                    }
                />
            ) : (
                <br />
            )}
            <PhotoTable
                photos={dataPhotos?.payload}
                loader={loadingPhotos}
            />
            <br />
            <Grid>
                <Grid.Column
                    computer={6}
                    tablet={16}
                    mobile={16}
                >
                    <Chart
                        loader={fileLoading}
                        config={chart_coordinates}
                        data={[chartData]}
                    />
                </Grid.Column>
                <Grid.Column
                    computer={10}
                    tablet={16}
                    mobile={16}
                >
                    <Chart
                        loader={fileLoading}
                        config={chart_coordlines}
                        data={[chartRa, chartDec]}
                    />
                </Grid.Column>
                {chartHFR.length ? (
                    <Grid.Column width={16}>
                        <Chart
                            loader={fileLoading}
                            config={chart_statistic}
                            data={[chartHFR, chartSNR]}
                        />
                    </Grid.Column>
                ) : (
                    ''
                )}
            </Grid>
            <br />
            <FilesTable
                loader={fileLoading}
                object={typeof objectName === 'string' ? objectName : ''}
                files={dataFiles?.payload!}
            />
            <br />
            <ObjectCloud
                loader={namesLoading}
                current={typeof objectName === 'string' ? objectName : ''}
                names={dataNames?.payload}
                link={'objects'}
            />
        </main>
    )
}

export default Object
