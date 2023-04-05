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
import { NextSeo } from 'next-seo'
import React from 'react'
import { Dimmer, Loader, Message } from 'semantic-ui-react'

import ObjectTable from '@/components/object-table'
import ObjectsTableToolbar from '@/components/objects-table-toolbar'

export const getStaticProps = wrapper.getStaticProps((store) => async () => {
    store.dispatch(getCatalogList.initiate())
    store.dispatch(getObjectList.initiate())
    store.dispatch(getPhotoList.initiate())

    await Promise.all(store.dispatch(getRunningQueriesThunk()))

    return {
        props: { object: {} }
    }
})

const TableLoader: React.FC = () => (
    <div className='box loader'>
        <Dimmer active>
            <Loader />
        </Dimmer>
    </div>
)

const Objects: React.FC = () => {
    const [search, setSearch] = React.useState<string>('')
    const [categories, setCategories] = React.useState<string[]>([])
    const {
        data: objectData,
        isSuccess,
        isLoading,
        isError
    } = useGetObjectListQuery()
    const { data: photoData } = useGetPhotoListQuery()
    const { data: catalogData } = useGetCatalogListQuery()

    const listObjects = React.useMemo(() => {
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

    const listFilteredObjects = React.useMemo(():
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

    const listCategories = React.useMemo(() => {
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
        <main>
            <NextSeo
                title={'Список астрономических объектов'}
                description={
                    'Список галактик, туманностей, астероидов, комет, сверхновых и других космических объектов, снятых любительским телескопом'
                }
                openGraph={{
                    images: [
                        {
                            height: 814,
                            url: '/screenshots/objects.jpg',
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />
            {isError && (
                <Message
                    error
                    content={'Возникла ошибка при получении списка объектов'}
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
        </main>
    )
}

export default Objects
