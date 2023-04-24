import { useDeleteCategoryMutation, useGetCategoriesListQuery } from '@/api/api'
import { useAppSelector } from '@/api/hooks'
import { NextSeo } from 'next-seo'
import React, { useState } from 'react'
import { Button, Confirm, Grid, Icon, Message } from 'semantic-ui-react'

import CategoryFormModal from '@/components/category-form-modal'
import CategoryTable from '@/components/category-table'
import styles from '@/components/category-table/styles.module.sass'

//
// export const getStaticProps = wrapper.getStaticProps((store) => async () => {
//     store.dispatch(getCatalogList.initiate())
//
//     await Promise.all(store.dispatch(getRunningQueriesThunk()))
//
//     return {
//         props: { object: {} }
//     }
// })

const Directory: React.FC = () => {
    const [showMessage, setShowMessage] = useState<boolean>(false)
    const [editModalVisible, setEditModalVisible] = useState<boolean>(false)
    const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false)
    const [modifyItemName, setModifyItemName] = useState<number>()

    const userAuth = useAppSelector((state) => state.auth.userAuth)

    const { data: categoriesData, isLoading: categoriesLoading } =
        useGetCategoriesListQuery()

    const [
        deleteItem,
        {
            isLoading: deleteLoading,
            isSuccess: deleteSuccess,
            isError: deleteError
        }
    ] = useDeleteCategoryMutation()

    const handleAddCatalog = () => {
        setModifyItemName(undefined)
        setEditModalVisible(true)
    }

    const handleEditCatalog = (item: number) => {
        setModifyItemName(item)
        setEditModalVisible(true)
    }

    const handleDeleteCatalog = (item: number) => {
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
            <NextSeo title={'Справочники'} />
            <Grid>
                <Grid.Column
                    computer={8}
                    tablet={16}
                    mobile={16}
                >
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
                    <h3 className={'subTitle inline'}>Категории объектов</h3>
                    {userAuth && (
                        <Button
                            icon={true}
                            floated={'right'}
                            labelPosition={'left'}
                            color={'orange'}
                            size={'tiny'}
                            onClick={handleAddCatalog}
                        >
                            <Icon name={'plus'} />
                            Добавить
                        </Button>
                    )}
                    <br />
                    <br />
                    <CategoryTable
                        categories={categoriesData?.items}
                        loading={categoriesLoading}
                        onClickEdit={handleEditCatalog}
                        onClickDelete={handleDeleteCatalog}
                    />
                </Grid.Column>
                <Grid.Column
                    computer={8}
                    tablet={16}
                    mobile={16}
                ></Grid.Column>
            </Grid>
            <CategoryFormModal
                visible={editModalVisible}
                value={categoriesData?.items?.find(
                    ({ id }) => id === modifyItemName
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

export default Directory
