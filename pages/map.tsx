import { useGetCatalogListQuery } from '@/api/api'
import { TCatalog } from '@/api/types'
import Script from 'next/script'
import React, { useEffect, useMemo, useState } from 'react'

import SkyMap from '@/components/celestial-map'
import ObjectCloudSkyMap from '@/components/celestial-map/ObjectCloudSkyMap'

export default function Map() {
    const { data, isSuccess } = useGetCatalogListQuery()
    const [goToObject, setGoToObject] = useState<[number, number]>([0, 0])

    const listObjects = useMemo(() => {
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

    useEffect(() => {
        document.title = 'Астрономическая карта - Обсерватория'
    })

    return (
        <main>
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
            <div className='box table global-map'>
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
