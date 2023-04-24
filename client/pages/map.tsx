import {
    getCatalogList,
    getRunningQueriesThunk,
    useGetCatalogListQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { TCatalog } from '@/api/types'
import { NextSeo } from 'next-seo'
import React, { useMemo, useState } from 'react'

import SkyMap from '@/components/celestial-map'
import ObjectCloudSkyMap from '@/components/celestial-map/ObjectCloudSkyMap'

export const getStaticProps = wrapper.getStaticProps((store) => async () => {
    store.dispatch(getCatalogList.initiate())

    await Promise.all(store.dispatch(getRunningQueriesThunk()))

    return {
        props: { object: {} }
    }
})

const Map: React.FC = () => {
    const { data, isFetching } = useGetCatalogListQuery()
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
            <div className={'box table global-map'}>
                <SkyMap
                    objects={listObjects}
                    interactive={true}
                    goto={goToObject}
                />
            </div>
            <br />
            <ObjectCloudSkyMap
                loading={isFetching || !listObjects?.length}
                objects={listObjects}
                handleClick={(ra, dec) => setGoToObject([ra, dec])}
            />
        </main>
    )
}

export default Map
