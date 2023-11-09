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
import { formatDate } from '@/functions/helpers'
import { skipToken } from '@reduxjs/toolkit/query'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/dist/client/router'
import React, { useMemo } from 'react'
import {
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis
} from 'recharts'
import { Grid, Message } from 'semantic-ui-react'

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
            <Grid className={'section'}>
                <Grid.Column
                    computer={6}
                    tablet={16}
                    mobile={16}
                    style={{ paddingBottom: '0' }}
                >
                    <div
                        className={'box table'}
                        style={{ height: '250px' }}
                    >
                        <ResponsiveContainer
                            width='100%'
                            height='100%'
                            style={{ background: '#333333' }}
                        >
                            <ScatterChart
                                width={800}
                                height={300}
                                margin={{
                                    bottom: 10,
                                    left: 10,
                                    right: 10,
                                    top: 10
                                }}
                            >
                                <CartesianGrid
                                    stroke={'#676767'}
                                    strokeDasharray={'3'}
                                />
                                <XAxis
                                    hide={true}
                                    type='number'
                                    dataKey='ra'
                                    name='RA'
                                    unit='°'
                                    domain={['auto', 'auto']}
                                />
                                <YAxis
                                    tickCount={10}
                                    hide={true}
                                    type='number'
                                    dataKey='dec'
                                    name='DEC'
                                    unit='°'
                                    domain={['auto', 'auto']}
                                />
                                <ZAxis range={[20, 25]} />
                                <ReferenceLine
                                    x={
                                        filesSorted.reduce(
                                            (total, next) => total + next.ra,
                                            0
                                        ) / filesSorted.length
                                    }
                                    stroke='red'
                                    strokeDasharray='3 3'
                                />
                                <ReferenceLine
                                    y={
                                        filesSorted.reduce(
                                            (total, next) => total + next.dec,
                                            0
                                        ) / filesSorted.length
                                    }
                                    stroke='red'
                                    strokeDasharray='3 3'
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                        borderColor: '#808083',
                                        color: '#F0F0F0',
                                        fontSize: '11px',
                                        padding: '5px 10px'
                                    }}
                                    cursor={{ strokeDasharray: '3 3' }}
                                    itemStyle={{
                                        color: '#F0F0F0',
                                        padding: 0
                                    }}
                                />
                                <Scatter
                                    stroke={'#e6a241'}
                                    data={filesSorted}
                                >
                                    {filesSorted?.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={'#e6a241'}
                                        />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </Grid.Column>
                <Grid.Column
                    computer={10}
                    tablet={16}
                    mobile={16}
                    style={{ paddingBottom: '0' }}
                >
                    <div
                        className={'box table'}
                        style={{ height: '250px' }}
                    >
                        <ResponsiveContainer
                            width='100%'
                            height='100%'
                            style={{ background: '#333333' }}
                        >
                            <LineChart
                                width={800}
                                height={300}
                                data={filesSorted}
                                margin={{
                                    bottom: 10,
                                    left: -15,
                                    right: -15,
                                    top: 10
                                }}
                            >
                                <CartesianGrid
                                    stroke={'#676767'}
                                    strokeDasharray={'3'}
                                />
                                <YAxis
                                    yAxisId='1'
                                    domain={['auto', 'auto']}
                                    type='number'
                                    stroke={'#38bc57'}
                                />
                                <YAxis
                                    yAxisId='2'
                                    orientation='right'
                                    domain={['auto', 'auto']}
                                    stroke={'#08B8F4'}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                        borderColor: '#808083',
                                        color: '#F0F0F0',
                                        fontSize: '11px',
                                        padding: '5px 10px'
                                    }}
                                    itemStyle={{ padding: 0 }}
                                    labelFormatter={(label) =>
                                        formatDate(
                                            filesSorted?.[label]?.date_obs
                                        )
                                    }
                                />
                                <Line
                                    type='monotone'
                                    dataKey='ra'
                                    name='RA'
                                    unit='°'
                                    stroke={'#38bc57'}
                                    yAxisId='1'
                                    dot={false}
                                />
                                <Line
                                    type='monotone'
                                    dataKey='dec'
                                    name='DEC'
                                    unit='°'
                                    stroke={'#08B8F4'}
                                    fill='#8884d8'
                                    yAxisId='2'
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Grid.Column>
                {!!filesSorted?.filter(
                    ({ star_count, hfr }) => star_count && hfr
                ).length && (
                    <Grid.Column
                        width={16}
                        style={{ paddingBottom: '0' }}
                    >
                        <div
                            className={'box table'}
                            style={{ height: '250px' }}
                        >
                            <ResponsiveContainer
                                width='100%'
                                height='100%'
                                style={{ background: '#333333' }}
                            >
                                <LineChart
                                    width={800}
                                    height={300}
                                    data={filesSorted?.filter(
                                        ({ star_count, hfr }) =>
                                            star_count && hfr
                                    )}
                                    margin={{
                                        bottom: 10,
                                        left: -35,
                                        right: -25,
                                        top: 10
                                    }}
                                >
                                    <CartesianGrid
                                        stroke={'#676767'}
                                        strokeDasharray={'3'}
                                    />
                                    <YAxis
                                        yAxisId='1'
                                        domain={['auto', 'auto']}
                                        type='number'
                                        stroke={'#b8bc18'}
                                    />
                                    <YAxis
                                        yAxisId='2'
                                        orientation='right'
                                        domain={['auto', 'auto']}
                                        stroke={'#e64b24'}
                                    />
                                    <YAxis
                                        hide={true}
                                        yAxisId='3'
                                        orientation='right'
                                        domain={['auto', 'auto']}
                                        stroke={'#7face6'}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor:
                                                'rgba(0, 0, 0, 0.85)',
                                            borderColor: '#808083',
                                            color: '#F0F0F0',
                                            fontSize: '11px',
                                            padding: '5px 10px'
                                        }}
                                        itemStyle={{ padding: 0 }}
                                        labelFormatter={(label) => (
                                            <>
                                                <div>
                                                    {formatDate(
                                                        filesSorted?.[label]
                                                            ?.date_obs
                                                    )}
                                                </div>
                                                <div>
                                                    {
                                                        filesSorted?.[label]
                                                            ?.filter
                                                    }
                                                </div>
                                            </>
                                        )}
                                    />
                                    <Line
                                        type='monotone'
                                        dataKey='hfr'
                                        name='HFR'
                                        stroke={'#b8bc18'}
                                        yAxisId='1'
                                        dot={false}
                                    />
                                    <Line
                                        type='monotone'
                                        dataKey='star_count'
                                        name='Stars'
                                        stroke={'#e64b24'}
                                        fill='#8884d8'
                                        yAxisId='2'
                                        dot={false}
                                    />
                                    <Line
                                        type='monotone'
                                        dataKey='sky_background'
                                        name='Background'
                                        stroke={'#7face6'}
                                        fill='#8884d8'
                                        yAxisId='3'
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Grid.Column>
                )}
            </Grid>
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
