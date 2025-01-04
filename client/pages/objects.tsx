import { API, ApiModel } from '@/api'
// import { editCatalog, openFormCatalog } from '@/api/applicationSlice'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import uniq from 'lodash-es/uniq'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import React, { useMemo, useState } from 'react'
import { Button, Dropdown } from 'simple-react-ui-kit'

// import { Confirm, Message } from 'semantic-ui-react'
import AppLayout from '@/components/app-layout'
// import CatalogToolbar from '@/components/catalog-toolbar'
import ObjectTable from '@/components/objects-table'

interface ObjectsPageProps {
    categoriesList: ApiModel.Category[]
    objectsList: ApiModel.Object[]
    photosList: ApiModel.Photo[]
    objectsCount: number
}

// TODO Для кнопки "Добавить" добавить проверку на права доступа
// TODO В toolbar добавить быстрый поиск по названию объекта
const ObjectsPage: NextPage<ObjectsPageProps> = ({
    categoriesList,
    objectsList,
    photosList,
    objectsCount
}) => {
    const { t, i18n } = useTranslation()
    const router = useRouter()

    const [categoryFilter, setCategoryFilter] = useState<number | undefined>()

    // const dispatch = useAppDispatch()

    // const [search, setSearch] = useState<string>('')
    // const [showMessage, setShowMessage] = useState<boolean>(false)
    // const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false)
    // const [modifyItemName, setModifyItemName] = useState<string>()
    // const [localCategories, setLocalCategories] = useState<number[]>([])

    // const [
    //     deleteItem,
    //     {
    //         isLoading: deleteLoading,
    //         isSuccess: deleteSuccess,
    //         isError: deleteError
    //     }
    // ] = API.useCatalogDeleteMutation()

    // const filteredCatalog: ApiModel.Catalog[] | undefined = useMemo(
    //     () =>
    //         catalog?.filter(
    //             (item) =>
    //                 (search === '' ||
    //                     item.name
    //                         .toLowerCase()
    //                         .includes(search.toLowerCase()) ||
    //                     item.title
    //                         ?.toLowerCase()
    //                         .includes(search.toLowerCase())) &&
    //                 (!localCategories?.length ||
    //                     (item?.category &&
    //                         localCategories.includes(item.category)))
    //         ),
    //     [catalog, search, localCategories]
    // )

    // const handleEditCatalog = (item: string) => {
    //     const editableObject = catalog?.find(({ name }) => name === item)
    //
    //     dispatch(editCatalog(editableObject))
    //     dispatch(openFormCatalog(true))
    // }

    // const handleDeleteCatalog = (item: string) => {
    //     setModifyItemName(item)
    //     setDeleteModalVisible(true)
    // }

    // const confirmDeleteCatalog = () => {
    //     if (modifyItemName) {
    //         deleteItem(modifyItemName)
    //         setShowMessage(true)
    //         setDeleteModalVisible(false)
    //         setModifyItemName(undefined)
    //     }
    // }

    const handleCreate = () => {
        router.push('/objects/form')
    }

    const filteredCategoriesList = useMemo(
        () =>
            categoriesList?.filter(({ id }) =>
                uniq(
                    objectsList?.flatMap(({ categories }) => categories)
                )?.includes(id)
            ),
        [categoriesList, objectsList]
    )

    const filteredObjectsList = useMemo(
        () =>
            objectsList?.filter(({ categories }) =>
                categoryFilter ? categories?.includes(categoryFilter) : true
            ),
        [objectsList, categoryFilter]
    )

    return (
        <AppLayout>
            <NextSeo
                title={t('list-astronomical-objects')}
                description={t('description-object-list-page')}
                openGraph={{
                    images: [
                        {
                            height: 814,
                            url: '/screenshots/objects.jpg',
                            width: 1280
                        }
                    ],
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <div className={'toolbarHeader'}>
                <h1 className={'pageTitle'}>
                    {t('list-astronomical-objects')}
                </h1>
                <div className={'toolbarActions'}>
                    <Dropdown<number>
                        clearable={true}
                        value={categoryFilter}
                        placeholder={t('filter-by-category')}
                        onSelect={(category) =>
                            setCategoryFilter(category?.key)
                        }
                        options={filteredCategoriesList?.map((category) => ({
                            key: category.id,
                            value: category.title
                        }))}
                    />

                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        label={'Добавить'}
                        onClick={handleCreate}
                    />
                </div>
            </div>

            <ObjectTable
                objectsList={filteredObjectsList}
                photosList={photosList}
            />

            {/*{deleteError && (*/}
            {/*    <Message*/}
            {/*        error*/}
            {/*        onDismiss={() => {*/}
            {/*            setShowMessage(false)*/}
            {/*        }}*/}
            {/*        hidden={!showMessage}*/}
            {/*        header={'Ошибка удаления'}*/}
            {/*        content={*/}
            {/*            'При удалении объекта возникла ошибка, удаление временно невозможно'*/}
            {/*        }*/}
            {/*    />*/}
            {/*)}*/}

            {/*{deleteSuccess && (*/}
            {/*    <Message*/}
            {/*        success*/}
            {/*        onDismiss={() => {*/}
            {/*            setShowMessage(false)*/}
            {/*        }}*/}
            {/*        hidden={!showMessage}*/}
            {/*        header={'Объект удален'}*/}
            {/*        content={'Все данные объекта успешно удалены'}*/}
            {/*    />*/}
            {/*)}*/}

            {/*<CatalogToolbar*/}
            {/*    search={search}*/}
            {/*    categories={categories}*/}
            {/*    onChangeSearch={setSearch}*/}
            {/*    onChangeCategories={setLocalCategories}*/}
            {/*/>*/}
            {/*<ObjectTable*/}
            {/*    loading={deleteLoading}*/}
            {/*    catalog={filteredCatalog}*/}
            {/*    photos={photos}*/}
            {/*    categories={categories}*/}
            {/*    onClickEdit={handleEditCatalog}*/}
            {/*    onClickDelete={handleDeleteCatalog}*/}
            {/*/>*/}
            {/*<Confirm*/}
            {/*    open={deleteModalVisible}*/}
            {/*    size={'mini'}*/}
            {/*    className={'confirm'}*/}
            {/*    content={'Подтверждате удаление объекта из каталога?'}*/}
            {/*    onCancel={() => setDeleteModalVisible(false)}*/}
            {/*    onConfirm={confirmDeleteCatalog}*/}
            {/*/>*/}
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<ObjectsPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            const { data: photos } = await store.dispatch(
                API.endpoints?.photosGetList.initiate()
            )

            const { data: objects } = await store.dispatch(
                API.endpoints?.objectsGetList.initiate()
            )

            const { data: categories } = await store.dispatch(
                API.endpoints?.categoriesGetList.initiate()
            )

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    categoriesList: categories?.items || [],
                    objectsCount: objects?.count || 0,
                    objectsList: objects?.items || [],
                    photosList: photos?.items || []
                }
            }
        }
)

export default ObjectsPage
