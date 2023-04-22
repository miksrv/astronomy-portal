import {
    getCatalogList,
    getPhotoList,
    getRunningQueriesThunk,
    useGetCatalogListQuery,
    useGetCategoriesListQuery,
    useGetPhotoListQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { TCatalog } from '@/api/types'
import { NextSeo } from 'next-seo'
import React, { useState } from 'react'

import ObjectEditModal from '@/components/obect-edit-modal'
import ObjectTable from '@/components/object-table'
import ObjectsTableToolbar from '@/components/objects-table-toolbar'

export const getStaticProps = wrapper.getStaticProps((store) => async () => {
    store.dispatch(getCatalogList.initiate())
    store.dispatch(getPhotoList.initiate())

    await Promise.all(store.dispatch(getRunningQueriesThunk()))

    return {
        props: { object: {} }
    }
})

const Objects: React.FC = () => {
    const [search, setSearch] = React.useState<string>('')
    const [editModalVisible, setEditModalVisible] = useState<boolean>(false)
    const [editModalItem, setEditModalItem] = useState<string>()
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
                    (!categories?.length || categories.includes(item?.category))
            ),
        [catalogData?.items, search, categories]
    )

    const handleAddCatalog = () => {
        setEditModalItem(undefined)
        setEditModalVisible(true)
    }

    const handleEditCatalog = (item: string) => {
        setEditModalItem(item)
        setEditModalVisible(true)
    }

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
                onAddCatalog={handleAddCatalog}
                onChangeSearch={setSearch}
                onChangeCategories={setCategories}
            />
            <ObjectTable
                loading={catalogLoading || photoLoading}
                catalog={filteredCatalog}
                photos={photoData?.items}
                categories={categoriesData?.items}
                onClickEdit={handleEditCatalog}
            />
            <ObjectEditModal
                visible={editModalVisible}
                skyMapVisible={true}
                value={catalogData?.items?.find(
                    ({ name }) => name === editModalItem
                )}
                onClose={() => setEditModalVisible(false)}
            />
        </main>
    )
}

export default Objects
