import {
    getCatalogList,
    getRunningQueriesThunk,
    useGetCatalogListQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { TCatalog } from '@/api/types'
import { NextSeo } from 'next-seo'
import React from 'react'

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
    const { data, isSuccess } = useGetCatalogListQuery()
    const [goToObject, setGoToObject] = React.useState<[number, number]>([0, 0])

    const listObjects = React.useMemo(() => {
        return data?.payload.length
            ? data?.payload
                  .filter((item: TCatalog) => item.ra !== 0 && item.dec !== 0)
                  .map((item: TCatalog) => {
                      return {
                          dec: item.dec,
                          name: item.name,
                          ra: item.ra
                      }
                  })
            : []
    }, [data])

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
                loader={isSuccess && !listObjects?.length}
                objects={listObjects}
                handleClick={(ra, dec) => setGoToObject([ra, dec])}
            />
        </main>
    )
}

export default Map
