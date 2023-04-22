import {
    getCatalogList,
    getPhotoList,
    getRunningQueriesThunk,
    useDeleteCatalogMutation,
    useGetCatalogListQuery,
    useGetCategoriesListQuery,
    useGetPhotoListQuery,
    usePatchCatalogMutation
} from '@/api/api'
import { wrapper } from '@/api/store'
import { TCatalog } from '@/api/types'
import { NextSeo } from 'next-seo'
import React, { useState } from 'react'
import { Confirm, Message } from 'semantic-ui-react'

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
    const [showMessage, setShowMessage] = useState<boolean>(false)
    const [editModalVisible, setEditModalVisible] = useState<boolean>(false)
    const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false)
    const [modifyItemName, setModifyItemName] = useState<string>()
    const [categories, setCategories] = React.useState<number[]>([])

    const { data: categoriesData } = useGetCategoriesListQuery()
    const { data: photoData, isLoading: photoLoading } = useGetPhotoListQuery()
    const { data: catalogData, isLoading: catalogLoading } =
        useGetCatalogListQuery()

    const [
        deleteItem,
        {
            isLoading: deleteLoading,
            isSuccess: deleteSuccess,
            isError: deleteError
        }
    ] = useDeleteCatalogMutation()

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
        setModifyItemName(undefined)
        setEditModalVisible(true)
    }

    const handleEditCatalog = (item: string) => {
        setModifyItemName(item)
        setEditModalVisible(true)
    }

    const handleDeleteCatalog = (item: string) => {
        setModifyItemName(item)
        setDeleteModalVisible(true)
    }

    const confirmDeleteCatalog = () => {
        if (modifyItemName) {
            deleteItem(modifyItemName)
            setShowMessage(true)
            setDeleteModalVisible(false)
            setModifyItemName(undefined)
        }
    }

    console.log('deleteError', deleteError)
    console.log('deleteSuccess', deleteSuccess)
    console.log('showMessage', showMessage)

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
            {deleteError && (
                <Message
                    error
                    onDismiss={() => {
                        setShowMessage(false)
                    }}
                    hidden={!showMessage}
                    header={'Ошибка удаления'}
                    content={
                        'При удалении объекта возникла ошибка, удаление временно невозможно'
                    }
                />
            )}
            {deleteSuccess && (
                <Message
                    success
                    onDismiss={() => {
                        setShowMessage(false)
                    }}
                    hidden={!showMessage}
                    header={'Объект удален'}
                    content={'Все данные объекта успешно удалены'}
                />
            )}
            <ObjectsTableToolbar
                search={search}
                categories={categoriesData?.items}
                onAddCatalog={handleAddCatalog}
                onChangeSearch={setSearch}
                onChangeCategories={setCategories}
            />
            <ObjectTable
                loading={catalogLoading || photoLoading || deleteLoading}
                catalog={filteredCatalog}
                photos={photoData?.items}
                categories={categoriesData?.items}
                onClickEdit={handleEditCatalog}
                onClickDelete={handleDeleteCatalog}
            />
            <ObjectEditModal
                visible={editModalVisible}
                skyMapVisible={true}
                value={catalogData?.items?.find(
                    ({ name }) => name === modifyItemName
                )}
                onClose={() => setEditModalVisible(false)}
            />
            <Confirm
                open={deleteModalVisible}
                size={'mini'}
                className={'confirm'}
                content={'Подтверждате удаление объекта из каталога?'}
                onCancel={() => setDeleteModalVisible(false)}
                onConfirm={confirmDeleteCatalog}
            />
        </main>
    )
}

export default Objects
