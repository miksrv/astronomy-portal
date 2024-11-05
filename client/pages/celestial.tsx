import { API } from '@/api'
import { wrapper } from '@/api/store'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import dynamic from 'next/dynamic'
import Script from 'next/script'
import React, { useMemo, useState } from 'react'

import AppLayout from '@/components/app-layout'
import ObjectCloudSkyMap from '@/components/celestial-map/ObjectCloudSkyMap'

const CelestialMap = dynamic(() => import('@/components/celestial-map'), {
    ssr: false
})

const CelestialPage: NextPage = () => {
    const { data, isFetching } = API.useCatalogGetListQuery()
    const [goToObject, setGoToObject] = useState<[number, number]>([0, 0])

    const listObjects = useMemo(
        () =>
            data?.items
                ?.filter((item) => item.coord_ra !== 0 && item.coord_dec !== 0)
                ?.map((item) => {
                    return {
                        dec: item.coord_dec,
                        name: item.name,
                        ra: item.coord_ra
                    }
                }) || [],
        [data]
    )

    return (
        <AppLayout fullWidth={true}>
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

            <NextSeo
                title={'Карта астрономических объектов'}
                description={
                    'Карта звездного неба с галактиками, туманностями, кометами, сверхновыми и другими космическими объектами, снятых любительским телескопом'
                }
                openGraph={{
                    images: [
                        {
                            height: 815,
                            url: '/screenshots/celestial.jpg',
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />

            <CelestialMap
                objects={listObjects}
                interactive={true}
                goto={goToObject}
            />

            <ObjectCloudSkyMap
                loading={isFetching || !listObjects?.length}
                objects={listObjects}
                handleClick={(ra, dec) => setGoToObject([ra, dec])}
            />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) => async () => {
        store.dispatch(API.endpoints.catalogGetList.initiate())

        await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

        return {
            props: { object: {} }
        }
    }
)

export default CelestialPage
