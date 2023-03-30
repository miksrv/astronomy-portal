import {store} from "@/api/store";
import {getPhotoList, getCatalogItem, useGetCatalogItemQuery, getRunningQueriesThunk, useGetPhotoListItemQuery, useGetPhotoListQuery} from "@/api/api";
import {wrapper} from "@/api/store";
import { useRouter } from "next/dist/client/router";
import { skipToken } from "@reduxjs/toolkit/query";
import { Message } from 'semantic-ui-react'
import PhotoItemHeader from "@/components/photo-item-header/photoItemHeader";
import React, {useMemo, useEffect} from "react";
import PhotoTable from "@/components/photo-table/PhotoTable";
import ObjectCloud from "@/components/object-cloud/ObjectCloud";
import Script from "next/script";

export async function getStaticPaths() {
    const storeObject = store();
    const result = await storeObject.dispatch(getPhotoList.initiate());

    return {
        paths: result.data?.payload.map((item) => `/photos/${item.object}`),
        fallback: true,
    };
}

export const getStaticProps = wrapper.getStaticProps(
    (store) => async (context) => {
        const name = context.params?.name;
        if (typeof name === "string") {
            store.dispatch(getCatalogItem.initiate(name));
        }

        await Promise.all(store.dispatch(getRunningQueriesThunk()));

        return {
            props: { object: {} },
        };
    }
);

export default function Photo() {
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

    const date = router.query.date;  //new URLSearchParams(window.location.search).get('date')

    const { data: dataPhotos, isFetching: photosLoading } =
        useGetPhotoListItemQuery(typeof name === "string" ? name : skipToken)
    const { data: dataCatalog, isLoading: catalogLoading } =
        useGetCatalogItemQuery(typeof name === "string" ? name : skipToken)
    const { data: photosList, isLoading: photosListLoading } =
        useGetPhotoListQuery()

    const currentPhoto = useMemo(() => {
        const searchPhoto =
            dataPhotos?.payload &&
            date &&
            dataPhotos?.payload.filter((photo) => photo.date === date)
        return searchPhoto && searchPhoto.length
            ? searchPhoto.pop()
            : dataPhotos?.payload?.[0]
    }, [dataPhotos, date])

    const listPhotoNames = useMemo(() => {
        return photosList?.payload.length
            ? photosList.payload
                .map((item) => item.object)
                .filter(
                    (item, index, self) =>
                        item !== '' && self.indexOf(item) === index
                )
            : []
    }, [photosList])

    useEffect(() => {
        document.title = `${
            dataCatalog?.payload ? dataCatalog.payload.title : ''
        } Фото - Обсерватория`
    }, [dataCatalog])

    return !dataPhotos?.status && !photosLoading ? (
        <Message
            error
            content='Что-то пошло не так, такого объекта нет. Возможно не верный адрес ссылки?'
        />
    ) : (
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
            <PhotoItemHeader
                loader={photosLoading || catalogLoading}
                photo={currentPhoto}
                catalog={dataCatalog?.payload}
            />
            {dataPhotos?.payload && (
                <>
                    <br />
                    <PhotoTable photos={dataPhotos?.payload} />
                </>
            )}
            <br />
            <ObjectCloud
                loader={photosListLoading}
                current={typeof name === "string" ? name : ''}
                names={listPhotoNames}
                link='photos'
            />
        </>
    )
}
