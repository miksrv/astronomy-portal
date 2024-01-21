import {
    catalogGetList,
    categoryGetList,
    getRunningQueriesThunk,
    photoGetList,
    useCatalogDeleteMutation
} from '@/api/api'
import { editCatalog, openFormCatalog } from '@/api/applicationSlice'
import { useAppDispatch } from '@/api/hooks'
import { wrapper } from '@/api/store'
import { TCatalog, TCategory, TPhoto } from '@/api/types'
import { GetServerSidePropsResult, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useMemo, useState } from 'react'
import { Confirm, Message } from 'semantic-ui-react'

import CatalogToolbar from '@/components/catalog-toolbar'
import ObjectTable from '@/components/object-table'

interface ObjectsPageProps {
    categoryList: TCategory[]
    photoList: TPhoto[]
    catalogList: TCatalog[]
}

const ObjectsPage: NextPage<ObjectsPageProps> = ({
    categoryList,
    photoList,
    catalogList
}) => {
    const dispatch = useAppDispatch()

    const [search, setSearch] = useState<string>('')
    const [showMessage, setShowMessage] = useState<boolean>(false)
    const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false)
    const [modifyItemName, setModifyItemName] = useState<string>()
    const [categories, setCategories] = useState<number[]>([])

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
            catalogList?.filter(
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
        [catalogList, search, categories]
    )

    const handleEditCatalog = (item: string) => {
        const editableObject = catalogList?.find(({ name }) => name === item)

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
                categories={categoryList}
                onChangeSearch={setSearch}
                onChangeCategories={setCategories}
            />
            <ObjectTable
                loading={deleteLoading}
                catalog={filteredCatalog}
                photos={photoList}
                categories={categoryList}
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

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (): Promise<GetServerSidePropsResult<ObjectsPageProps>> => {
            const { data: catalogData } = await store.dispatch(
                catalogGetList.initiate()
            )

            const { data: categoriesData } = await store.dispatch(
                categoryGetList.initiate()
            )

            const { data: photosData } = await store.dispatch(
                photoGetList.initiate()
            )

            await Promise.all(store.dispatch(getRunningQueriesThunk()))

            return {
                props: {
                    catalogList: catalogData?.items || [],
                    categoryList: categoriesData?.items || [],
                    photoList: photosData?.items || []
                }
            }
        }
)

export default ObjectsPage
