import {
    catalogGetList,
    getRunningQueriesThunk,
    useCatalogGetListQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { TCatalog } from '@/api/types'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import dynamic from 'next/dynamic'
import React, { useMemo, useState } from 'react'

import ObjectCloudSkyMap from '@/components/celestial-map/ObjectCloudSkyMap'

const CelestialMap = dynamic(() => import('@/components/celestial-map'), {
    ssr: false
})

const CelestialPage: NextPage = () => {
    const { data, isFetching } = useCatalogGetListQuery()
    const [goToObject, setGoToObject] = useState<[number, number]>([0, 0])

    const listObjects = useMemo(
        () =>
            data?.items
                .filter((item) => item.coord_ra !== 0 && item.coord_dec !== 0)
                .map((item: TCatalog) => {
                    return {
                        dec: item.coord_dec,
                        name: item.name,
                        ra: item.coord_ra
                    }
                }) || [],
        [data]
    )

    return (
        <main>
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

            <div className={'box table global-map section'}>
                <CelestialMap
                    objects={listObjects}
                    interactive={true}
                    goto={goToObject}
                />
            </div>

            <ObjectCloudSkyMap
                loading={isFetching || !listObjects?.length}
                objects={listObjects}
                handleClick={(ra, dec) => setGoToObject([ra, dec])}
            />
        </main>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) => async () => {
        store.dispatch(catalogGetList.initiate())

        await Promise.all(store.dispatch(getRunningQueriesThunk()))

        return {
            props: { object: {} }
        }
    }
)

export default CelestialPage
