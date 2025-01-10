import { API, ApiModel, HOST_IMG, useAppSelector } from '@/api'
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
import AppToolbar from '@/components/app-toolbar'
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

const ObjectItemPage: NextPage<ObjectItemPageProps> = ({
    objectName,
    objectData,
    objectsList,
    categoriesList,
    photosList
}) => {
    const { t, i18n } = useTranslation()
    const router = useRouter()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

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

    return (
        <AppLayout>
            <NextSeo
                title={objectData?.title || objectName}
                description={
                    'Описание объекта наблюдения: ' +
                    sliceText(objectData?.description)
                }
                openGraph={{
                    images: [
                        {
                            height: 244,
                            url: objectData?.image
                                ? `${HOST_IMG}${objectData?.image}`
                                : 'images/no-photo.png',
                            width: 487
                        }
                    ],
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={objectData?.title || objectName}
                currentPage={objectData?.title || objectName}
                links={[
                    {
                        link: '/objects',
                        text: t('objects')
                    }
                ]}
            >
                {userRole === 'admin' && (
                    <>
                        <Button
                            icon={'Pencil'}
                            mode={'secondary'}
                            label={t('edit')}
                            disabled={!objectName}
                            onClick={handleEdit}
                        />

                        <Button
                            icon={'PlusCircle'}
                            mode={'secondary'}
                            label={t('add')}
                            onClick={handleCreate}
                        />
                    </>
                )}
            </AppToolbar>

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
