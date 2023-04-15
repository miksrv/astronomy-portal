import {
    useGetCatalogItemQuery,
    useGetPhotoListQuery,
    useGetStatisticCatalogItemsQuery
} from '@/api/api'
// import { store, wrapper } from '@/api/store'
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

// export const getStaticPaths = async () => {
//     const storeObject = store()
//     const result = await storeObject.dispatch(
//         getStatisticCatalogItems.initiate()
//     )
//
//     return {
//         fallback: false,
//         // paths: ['/objects/M_1']
//         paths: result.data?.items.map((item) => ({ params: { name: item } }))
//
//         // [
//         //     { params: { name: 'IC_1396' } }
//         // ]
//         // paths: result.data?.items.map((item) => `/objects/${item}`)
//     }
// }

// export const getStaticProps = wrapper.getStaticProps(
//     (store) => async (context) => {
//         const name = context.params?.name
//
//         if (typeof name === 'string') {
//             store.dispatch(getStatisticCatalogItems.initiate())
//             // store.dispatch(getCatalogList.initiate())
//             //     store.dispatch(getObjectNames.initiate())
//             //     store.dispatch(getPhotoList.initiate({ object: name }))
//             //     store.dispatch(getObjectItem.initiate(name))
//             //     store.dispatch(getCatalogItem.initiate(name))
//             //     store.dispatch(getObjectFiles.initiate(name))
//             //     store.dispatch(getObjectFiles.initiate(name))
//         }
//
//         await Promise.all(store.dispatch(getRunningQueriesThunk()))
//
//         return {
//             props: {}
//         }
//     }
// )

const Object: React.FC = () => {
    const router = useRouter()
    const routerObject = router.query.name
    const objectName =
        typeof routerObject === 'string' ? routerObject : skipToken

    const { data: photosData, isLoading: photosLoading } = useGetPhotoListQuery(
        { object: typeof objectName === 'string' ? objectName : '' },
        {
            skip: router.isFallback
        }
    )

    const { data: catalogData, isLoading: catalogLoading } =
        useGetCatalogItemQuery(objectName, {
            skip: router.isFallback
        })

    const { data: catalogObjects, isLoading: objectsLoading } =
        useGetStatisticCatalogItemsQuery()

    // const {
    //     data: dataObject,
    //     isFetching: objectLoading,
    //     isError
    // } = useGetObjectItemQuery(objectName, { skip: router.isFallback })
    // const { data: dataCatalog, isFetching: catalogLoading } =
    //     useGetCatalogItemQuery(objectName, { skip: router.isFallback })
    // const { data: dataPhotos, isFetching: loadingPhotos } =
    //     useGetPhotoListItemQuery(objectName, {
    //         skip: router.isFallback
    //     })
    // const { data: dataFiles, isFetching: fileLoading } = useGetObjectFilesQuery(
    //     objectName,
    //     { skip: router.isFallback }
    // )
    // const { data: dataNames, isFetching: namesLoading } =
    //     useGetObjectNamesQuery()

    const objectTitle = React.useMemo(
        () => catalogData?.title || catalogData?.name || objectName.toString(),
        [catalogData, objectName]
    )

    const [chartData, setChartData] = React.useState<[number, number][]>([])
    const [chartRa, setChartRa] = React.useState<number[]>([])
    const [chartDec, setChartDec] = React.useState<number[]>([])
    const [chartHFR, setChartHFR] = React.useState<number[]>([])
    const [chartSNR, setChartSNR] = React.useState<number[]>([])
    const [devRa, setDevRa] = React.useState<number>(0)
    const [devDec, setDevDec] = React.useState<number>(0)

    React.useEffect(() => {
        if (catalogData?.files?.length) {
            let middleRa = 0
            let middleDec = 0
            let counter = 0
            let tmpChartData: [number, number][] = []
            let tmpChartRa: number[] = []
            let tmpChartDec: number[] = []
            let tmpChartHFR: number[] = []
            let tmpChartSNR: number[] = []

            catalogData?.files.forEach((item) => {
                middleRa += item.ra
                middleDec += item.dec
                counter += 1

                tmpChartData.push([item.ra, item.dec])
                tmpChartRa.push(item.ra)
                tmpChartDec.push(item.dec)

                if (item.hfr) {
                    tmpChartHFR.push(item.hfr)
                }

                if (item.sky_background) {
                    tmpChartSNR.push(item.sky_background)
                }
            })

            setDevRa(Math.max(...tmpChartRa) - Math.min(...tmpChartRa))
            setDevDec(Math.max(...tmpChartDec) - Math.min(...tmpChartDec))
            setChartDec(tmpChartDec)
            setChartRa(tmpChartRa)
            setChartData(tmpChartData)
            setChartHFR(tmpChartHFR)
            setChartSNR(tmpChartSNR)

            chart_coordinates.xAxis.plotLines[0].value = middleRa / counter
            chart_coordinates.yAxis.plotLines[0].value = middleDec / counter
        }
    }, [catalogData?.files])

    return (
        <main>
            <NextSeo
                title={`${objectTitle} - Данные астрономического объекта`}
                description={catalogData?.text
                    .replace(/(\r\n|\n|\r)/gm, '')
                    .slice(0, 200)}
                openGraph={{
                    // images: [
                    //     {
                    //         height: 743,
                    //         url: `${process.env.NEXT_PUBLIC_IMG_HOST}public/photo/${dataPhotos?.payload?.[0].image_name}_thumb.${dataPhotos?.payload?.[0]?.image_ext}`,
                    //         width: 1280
                    //     }
                    // ],
                    locale: 'ru'
                }}
            />
            <ObjectSection
                title={objectTitle}
                loader={catalogLoading}
                catalog={catalogData}
                deviationRa={Math.round(devRa * 100) / 100}
                deviationDec={Math.round(devDec * 100) / 100}
            />
            {isOutdated(photosData?.items?.[0].date!, catalogData?.updated!) ? (
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
                photos={photosData?.items}
                loader={photosLoading}
            />
            <br />
            <Grid>
                <Grid.Column
                    computer={6}
                    tablet={16}
                    mobile={16}
                >
                    <Chart
                        loader={catalogLoading}
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
                        loader={catalogLoading}
                        config={chart_coordlines}
                        data={[chartRa, chartDec]}
                    />
                </Grid.Column>
                {chartHFR.length > 0 ? (
                    <Grid.Column width={16}>
                        <Chart
                            loader={catalogLoading}
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
                loader={catalogLoading}
                objectName={typeof objectName === 'string' ? objectName : ''}
                files={catalogData?.files}
            />
            <br />
            <ObjectCloud
                loader={objectsLoading}
                current={typeof objectName === 'string' ? objectName : ''}
                names={catalogObjects?.items}
                link={'objects'}
            />
        </main>
    )
}

export default Object
