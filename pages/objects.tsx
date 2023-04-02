import {
    getCatalogList,
    getObjectList,
    getPhotoList,
    getRunningQueriesThunk,
    useGetCatalogListQuery,
    useGetObjectListQuery,
    useGetPhotoListQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { IObjectListItem, TCatalog } from '@/api/types'
import Script from 'next/script'
import React, { useMemo, useState } from 'react'
import { Dimmer, Loader, Message } from 'semantic-ui-react'

import ObjectTable from '@/components/object-table'
import ObjectsTableToolbar from '@/components/objects-table-toolbar'

export const getStaticProps = wrapper.getStaticProps(
    (store) => async (_context) => {
        store.dispatch(getCatalogList.initiate())
        store.dispatch(getObjectList.initiate())
        store.dispatch(getPhotoList.initiate())

        await Promise.all(store.dispatch(getRunningQueriesThunk()))

        return {
            props: { object: {} }
        }
    }
)

const TableLoader: React.FC = () => (
    <div className='box loader'>
        <Dimmer active>
            <Loader />
        </Dimmer>
    </div>
)

export default function Objects() {
    const [search, setSearch] = useState<string>('')
    const [categories, setCategories] = useState<string[]>([])
    const {
        data: objectData,
        isSuccess,
        isLoading,
        isError
    } = useGetObjectListQuery()
    const { data: photoData } = useGetPhotoListQuery()
    const { data: catalogData } = useGetCatalogListQuery()

    const listObjects = useMemo(() => {
        if (objectData?.payload.length) {
            return objectData.payload.map((item) => ({
                ...item,
                ...catalogData?.payload
                    .filter((catalog) => item.name === catalog.name)
                    .pop()
            }))
        }

        return []
    }, [objectData, catalogData])

    const listFilteredObjects = useMemo(():
        | (IObjectListItem & TCatalog)[]
        | any => {
        return listObjects.length
            ? listObjects.filter(
                  (item) =>
                      (search === '' ||
                          item.name
                              .toLowerCase()
                              .includes(search.toLowerCase()) ||
                          item.title
                              ?.toLowerCase()
                              .includes(search.toLowerCase())) &&
                      (!categories.length ||
                          categories.includes(
                              item?.category ? item?.category : ''
                          ))
              )
            : []
    }, [search, categories, listObjects])

    const listCategories = useMemo(() => {
        return catalogData && catalogData.payload.length
            ? catalogData.payload
                  .map((item) => item.category)
                  .filter(
                      (item, index, self) =>
                          item !== '' && self.indexOf(item) === index
                  )
            : []
    }, [catalogData])

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
            {isError && (
                <Message
                    error
                    content='Возникла ошибка при получении списка объектов'
                />
            )}
            <ObjectsTableToolbar
                search={search}
                categories={listCategories}
                onChangeSearch={setSearch}
                onChangeCategories={setCategories}
            />
            {isLoading && <TableLoader />}
            {isSuccess && objectData?.payload.length && (
                <ObjectTable
                    objects={listFilteredObjects}
                    photos={photoData?.payload}
                />
            )}
        </>
    )
}
