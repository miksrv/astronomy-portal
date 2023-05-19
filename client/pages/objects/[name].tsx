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
import dynamic from 'next/dynamic'
import React, { useEffect, useMemo, useState } from 'react'
import { Grid, Message } from 'semantic-ui-react'

import chart_coordinates from '@/components/chart/chart_coordinates'
import chart_coordlines from '@/components/chart/chart_coordlines'
import chart_statistic from '@/components/chart/chart_statistic'
import FilesTable from '@/components/files-table'
import ObjectCloud from '@/components/object-cloud'
import ObjectSection from '@/components/objects-section'
import PhotoTable from '@/components/photo-table'

const Chart = dynamic(() => import('@/components/chart'), {
    ssr: false
})

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
            store.dispatch(await statisticGetCatalogItems.initiate())
            store.dispatch(await catalogGetItem.initiate(name))
            store.dispatch(await photoGetList.initiate({ object: name }))

            await Promise.all(store.dispatch(getRunningQueriesThunk()))
        }

        return {
            props: {}
        }
    }
)

const ObjectItem: NextPage = () => {
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

    const [chartData, setChartData] = useState<[number, number][]>()
    const [chartRa, setChartRa] = useState<number[]>()
    const [chartDec, setChartDec] = useState<number[]>()
    const [chartHFR, setChartHFR] = useState<number[]>()
    const [chartSNR, setChartSNR] = useState<number[]>()
    const [devRa, setDevRa] = useState<number>(0)
    const [devDec, setDevDec] = useState<number>(0)

    useEffect(() => {
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
                title={`${objectTitle} - Объект`}
                description={sliceText(catalogData?.text ?? '', 200)}
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
                deviationRa={Math.round(devRa * 100) / 100}
                deviationDec={Math.round(devDec * 100) / 100}
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
            {catalogData?.files?.length ? (
                <div className={'section'}>
                    <Grid>
                        <Grid.Column
                            computer={6}
                            tablet={16}
                            mobile={16}
                        >
                            <Chart
                                loading={catalogLoading}
                                config={chart_coordinates}
                                data={chartData ? [chartData] : undefined}
                            />
                        </Grid.Column>
                        <Grid.Column
                            computer={10}
                            tablet={16}
                            mobile={16}
                        >
                            <Chart
                                loading={catalogLoading}
                                config={chart_coordlines}
                                data={
                                    chartRa && chartDec
                                        ? [chartRa, chartDec]
                                        : undefined
                                }
                            />
                        </Grid.Column>
                        {chartHFR?.length ? (
                            <Grid.Column width={16}>
                                <Chart
                                    loading={catalogLoading}
                                    config={chart_statistic}
                                    data={
                                        chartHFR && chartSNR
                                            ? [chartHFR, chartSNR]
                                            : undefined
                                    }
                                />
                            </Grid.Column>
                        ) : (
                            ''
                        )}
                    </Grid>
                </div>
            ) : (
                ''
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

export default ObjectItem
