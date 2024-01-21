import {
    catalogGetList,
    categoryGetList,
    getRunningQueriesThunk,
    photoGetList,
    useCatalogDeleteMutation,
    useCatalogGetListQuery,
    useCategoryGetListQuery,
    usePhotoGetListQuery
} from '@/api/api'
import { editCatalog, openFormCatalog } from '@/api/applicationSlice'
import { useAppDispatch } from '@/api/hooks'
import { wrapper } from '@/api/store'
import { TCatalog } from '@/api/types'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useMemo, useState } from 'react'
import { Confirm, Message } from 'semantic-ui-react'

import CatalogToolbar from '@/components/catalog-toolbar'
import ObjectTable from '@/components/object-table'

export const getServerSideProps = wrapper.getServerSideProps(
    (store) => async () => {
        store.dispatch(catalogGetList.initiate())
        store.dispatch(categoryGetList.initiate())
        store.dispatch(photoGetList.initiate())

        await Promise.all(store.dispatch(getRunningQueriesThunk()))

        return {
            props: { object: {} }
        }
    }
)

const ObjectsPage: NextPage = () => {
    const dispatch = useAppDispatch()

    const [search, setSearch] = useState<string>('')
    const [showMessage, setShowMessage] = useState<boolean>(false)
    const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false)
    const [modifyItemName, setModifyItemName] = useState<string>()
    const [categories, setCategories] = useState<number[]>([])

    const { data: categoriesData } = useCategoryGetListQuery()
    const { data: photoData, isLoading: photoLoading } = usePhotoGetListQuery()
    const { data: catalogData, isLoading: catalogLoading } =
        useCatalogGetListQuery()

    const [
        deleteItem,
        {
            isLoading: deleteLoading,
            isSuccess: deleteSuccess,
            isError: deleteError
        }
    ] = useCatalogDeleteMutation()

    const filteredCatalog: TCatalog[] | undefined = useMemo(
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

    const handleEditCatalog = (item: string) => {
        const editableObject = catalogData?.items?.find(
            ({ name }) => name === item
        )

        dispatch(editCatalog(editableObject))
        dispatch(openFormCatalog(true))
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
            <CatalogToolbar
                search={search}
                categories={categoriesData?.items}
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

export default ObjectsPage
