import {store} from "@/api/store";
import {    useGetCatalogItemQuery,
    useGetObjectFilesQuery,
    useGetObjectItemQuery,
    useGetObjectNamesQuery, getCatalogList,
    useGetPhotoListItemQuery, getRunningQueriesThunk} from "@/api/api";
import { Grid, Message } from 'semantic-ui-react'
import {wrapper} from "@/api/store";
import { useRouter } from "next/dist/client/router";
import { skipToken } from "@reduxjs/toolkit/query";

import { isOutdated } from '@/functions/helpers'

import Chart from '@/components/chart'
import chart_coordinates from '@/components/chart/chart_coordinates'
import chart_coordlines from '@/components/chart/chart_coordlines'
import chart_statistic from '@/components/chart/chart_statistic'
import FilesTable from "@/components/files-table";
import ObjectCloud from '@/components/object-cloud'
import PhotoTable from '@/components/photo-table'

import ObjectsItemHeader from "@/components/objects-item-header";
import Script from "next/script";
import React from "react";

export async function getStaticPaths() {
    const storeObject = store();
    const result = await storeObject.dispatch(getCatalogList.initiate());

    return {
        paths: result.data?.payload.map((item) => `/objects/${item.name}`),
        fallback: true,
    };
}

export const getStaticProps = wrapper.getStaticProps(
    (store) => async (context) => {
        const name = context.params?.name;
        if (typeof name === "string") {
            store.dispatch(getCatalogList.initiate());
        }

        await Promise.all(store.dispatch(getRunningQueriesThunk()));

        return {
            props: { object: {} },
        };
    }
);

type TParamsURL = {
    name: string
}

export default function Object() {
    const router = useRouter();
    const name = router.query.name;

    const result = useGetCatalogItemQuery(
        typeof name === "string" ? name : skipToken,
        {
            // If the page is not yet generated, router.isFallback will be true
            // initially until getStaticProps() finishes running
            skip: router.isFallback,
        }
    );
    const { isLoading, error, data } = result;

    const {
        data: dataObject,
        isFetching: objectLoading,
        isError
    } = useGetObjectItemQuery(typeof name === "string" ? name : skipToken)
    const { data: dataCatalog, isFetching: catalogLoading } =
        useGetCatalogItemQuery(typeof name === "string" ? name : skipToken)
    const { data: dataPhotos } = useGetPhotoListItemQuery(typeof name === "string" ? name : skipToken)
    const { data: dataFiles, isFetching: fileLoading } = useGetObjectFilesQuery(
        typeof name === "string" ? name : skipToken
    )
    const { data: dataNames, isFetching: namesLoading } =
        useGetObjectNamesQuery()

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
        <>
            <Script
                src='/scripts/d3.min.js'
                strategy='beforeInteractive'
            />
            <Script
                src='/scripts/d3.geo.projection.min.js'
                strategy='beforeInteractive'
            />
            <Script
                src='/scripts/celestial.min.js'
                strategy='beforeInteractive'
            />
            <ObjectsItemHeader
                name={typeof name === "string" ? name : ''}
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
                    icon='warning sign'
                    header='Новые данные'
                    content='Фотографии устарели - есть новые данные с телескопа, с помощью которых можно собрать новое изображение объекта'
                />
            ) : (
                <br />
            )}
            {dataPhotos?.payload && !objectLoading && (
                <PhotoTable photos={dataPhotos?.payload} />
            )}
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
                {chartHFR.length && chartSNR.length ? (
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
                object={typeof name === "string" ? name : ''}
                files={dataFiles?.payload}
            />
            <br />
            <ObjectCloud
                loader={namesLoading}
                current={typeof name === "string" ? name : ''}
                names={dataNames?.payload}
                link='object'
            />
        </>
    )
}
