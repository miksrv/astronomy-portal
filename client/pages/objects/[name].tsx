import { API, ApiModel } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { sliceText } from '@/tools/strings'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import React, { useMemo } from 'react'
import { Button } from 'simple-react-ui-kit'

import AppLayout from '@/components/app-layout'
import ObjectsCloud from '@/components/object-cloud'
import ObjectDescription from '@/components/object-description'
import ObjectFilesTable from '@/components/object-files-table'
import ObjectHeader from '@/components/object-header'
import ObjectPhotoTable from '@/components/object-photos-table'

interface ObjectItemPageProps {
    objectName: string
    objectData?: ApiModel.Object
    objectsList?: ApiModel.Object[]
    categoriesList: ApiModel.Category[]
    photosList: ApiModel.Photo[]
}

// TODO: Добавить проверку на права доступа для отображения кнопок редактирования
const ObjectItemPage: NextPage<ObjectItemPageProps> = ({
    objectName,
    objectData,
    objectsList,
    categoriesList,
    photosList
}) => {
    const { t, i18n } = useTranslation()
    const router = useRouter()

    const { data: objectFilesData } = API.useFilesGetListQuery(objectName, {
        skip: !objectName
    })

    const allObjectsNames = useMemo(
        () => objectsList?.map(({ name }) => name),
        [objectsList]
    )

    const handleEdit = () => {
        if (objectName) {
            router.push(`/objects/form/?id=${objectName}`)
        }
    }

    const handleCreate = () => {
        router.push('/objects/form')
    }

    // const objectTitle = useMemo(
    //     () => catalog?.title || catalog?.name || object.toString(),
    //     [catalog, object]
    // )

    // const filesSorted = useMemo(
    //     () =>
    //         [...(catalog?.files || [])]?.sort(
    //             (a, b) =>
    //                 new Date(a.date_obs).getTime() -
    //                 new Date(b.date_obs).getTime()
    //         ),
    //     [catalog?.files]
    // )

    // const deviationRa: number = useMemo(() => {
    //     if (!catalog?.files?.length) {
    //         return 0
    //     }
    //
    //     const max = Math.max.apply(
    //         null,
    //         catalog?.files?.map(({ ra }) => ra) || []
    //     )
    //     const min = Math.min.apply(
    //         null,
    //         catalog?.files?.map(({ ra }) => ra) || []
    //     )
    //
    //     return Math.round((max - min) * 100) / 100
    // }, [catalog?.files])

    // const deviationDec: number = useMemo(() => {
    //     if (!catalog?.files?.length) {
    //         return 0
    //     }
    //
    //     const max = Math.max.apply(
    //         null,
    //         catalog?.files?.map(({ dec }) => dec) || []
    //     )
    //     const min = Math.min.apply(
    //         null,
    //         catalog?.files?.map(({ dec }) => dec) || []
    //     )
    //
    //     return Math.round((max - min) * 100) / 100
    // }, [catalog?.files])

    return (
        <AppLayout>
            <NextSeo
                title={objectData?.title}
                description={
                    'Описание объекта наблюдения: ' +
                    sliceText(objectData?.description)
                }
                openGraph={{
                    // images: [
                    //     {
                    //         height: 244,
                    //         url: catalog?.image
                    //             ? `${hosts.maps}${catalog?.image}`
                    //             : 'images/no-photo.png',
                    //         width: 487
                    //     }
                    // ],
                    // locale: 'ru'
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <div className={'toolbarHeader'}>
                <h1 className={'pageTitle'}>
                    {objectData?.title || objectName}
                </h1>
                <div className={'toolbarActions'}>
                    <Button
                        icon={'Pencil'}
                        mode={'secondary'}
                        label={'Редактировать'}
                        disabled={!objectName}
                        onClick={handleEdit}
                    />

                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        label={'Добавить'}
                        onClick={handleCreate}
                    />
                </div>
            </div>

            <ObjectHeader
                {...objectData}
                categoriesList={categoriesList}
            />

            {!!objectData?.description?.length && (
                <ObjectDescription text={objectData?.description} />
            )}

            {!!photosList?.length && (
                <ObjectPhotoTable photosList={photosList} />
            )}

            {!!objectFilesData?.items?.length && (
                <ObjectFilesTable filesList={objectFilesData?.items} />
            )}

            {!!allObjectsNames?.length && (
                <ObjectsCloud
                    objectNamesList={allObjectsNames}
                    selectedObject={objectName}
                />
            )}
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<ObjectItemPageProps>> => {
            const locale = context.locale ?? 'en'
            const objectName = context.params?.name
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            if (typeof objectName !== 'string') {
                return { notFound: true }
            }

            const { data: objectData, isError } = await store.dispatch(
                API.endpoints?.objectsGetItem.initiate(objectName)
            )

            if (isError) {
                return { notFound: true }
            }

            const { data: objectsList } = await store.dispatch(
                API.endpoints?.objectsGetList.initiate()
            )

            const { data: categoriesData } = await store.dispatch(
                API.endpoints?.categoriesGetList.initiate()
            )

            const { data: photosData } = await store.dispatch(
                API.endpoints?.photosGetList.initiate({
                    object: objectName
                })
            )

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    objectName,
                    objectData: objectData || undefined,
                    objectsList: objectsList?.items || [],
                    categoriesList: categoriesData?.items || [],
                    photosList: photosData?.items || []
                }
            }
        }
)

export default ObjectItemPage
