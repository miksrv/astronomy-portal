import { api } from '@/api/api'
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
    catalog: TCatalog[]
    categories: TCategory[]
    photos: TPhoto[]
}

const ObjectsPage: NextPage<ObjectsPageProps> = ({
    catalog,
    categories,
    photos
}) => {
    const dispatch = useAppDispatch()

    const [search, setSearch] = useState<string>('')
    const [showMessage, setShowMessage] = useState<boolean>(false)
    const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false)
    const [modifyItemName, setModifyItemName] = useState<string>()
    const [localCategories, setLocalCategories] = useState<number[]>([])

    const [
        deleteItem,
        {
            isLoading: deleteLoading,
            isSuccess: deleteSuccess,
            isError: deleteError
        }
    ] = api.useCatalogDeleteMutation()

    const filteredCatalog: TCatalog[] | undefined = useMemo(
        () =>
            catalog?.filter(
                (item) =>
                    (search === '' ||
                        item.name
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                        item.title
                            ?.toLowerCase()
                            .includes(search.toLowerCase())) &&
                    (!localCategories?.length ||
                        localCategories.includes(item?.category))
            ),
        [catalog, search, localCategories]
    )

    const handleEditCatalog = (item: string) => {
        const editableObject = catalog?.find(({ name }) => name === item)

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
                categories={categories}
                onChangeSearch={setSearch}
                onChangeCategories={setLocalCategories}
            />
            <ObjectTable
                loading={deleteLoading}
                catalog={filteredCatalog}
                photos={photos}
                categories={categories}
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
            const { data: catalog } = await store.dispatch(
                api.endpoints?.catalogGetList.initiate()
            )

            const { data: categories } = await store.dispatch(
                api.endpoints?.categoryGetList.initiate()
            )

            const { data: photos } = await store.dispatch(
                api.endpoints?.photoGetList.initiate()
            )

            await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()))

            return {
                props: {
                    catalog: catalog?.items || [],
                    categories: categories?.items || [],
                    photos: photos?.items || []
                }
            }
        }
)

export default ObjectsPage
