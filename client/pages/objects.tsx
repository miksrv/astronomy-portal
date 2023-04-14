import {
    getCatalogList, // getObjectList,
    getPhotoList,
    getRunningQueriesThunk,
    useGetCatalogListQuery,
    useGetCategoriesListQuery,
    useGetObjectListQuery,
    useGetPhotoListQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { TCatalog } from '@/api/types'
import { NextSeo } from 'next-seo'
import React from 'react'

import ObjectTable from '@/components/object-table'
import ObjectsTableToolbar from '@/components/objects-table-toolbar'

export const getStaticProps = wrapper.getStaticProps((store) => async () => {
    store.dispatch(getCatalogList.initiate())
    // store.dispatch(getObjectList.initiate())
    store.dispatch(getPhotoList.initiate())

    await Promise.all(store.dispatch(getRunningQueriesThunk()))

    return {
        props: { object: {} }
    }
})

const Objects: React.FC = () => {
    const [search, setSearch] = React.useState<string>('')
    const [categories, setCategories] = React.useState<number[]>([])
    const { data: categoriesData } = useGetCategoriesListQuery()
    const { data: photoData, isLoading: photoLoading } = useGetPhotoListQuery()
    const { data: catalogData, isLoading: catalogLoading } =
        useGetCatalogListQuery()

    const filteredCatalog: TCatalog[] | undefined = React.useMemo(
        () =>
            catalogData?.items?.filter(
                (item) =>
                    (search === '' ||
                        item.name
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                        item.title
                            ?.toLowerCase()
                            .includes(search.toLowerCase())) &&
                    (!categories.length || categories.includes(item?.category))
            ),
        [search, categories]
    )

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
            <ObjectsTableToolbar
                search={search}
                categories={categoriesData?.items}
                onChangeSearch={setSearch}
                onChangeCategories={setCategories}
            />
            <ObjectTable
                loading={catalogLoading || photoLoading}
                catalog={filteredCatalog}
                photos={photoData?.items}
            />
        </main>
    )
}

export default Objects
