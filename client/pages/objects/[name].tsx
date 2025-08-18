import React, { useMemo } from 'react'
import { Button } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'

import { API, ApiModel, HOST_IMG, setLocale, SITE_LINK, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar, ObjectPhotoTable, VisibilityChart } from '@/components/common'
import { ObjectDescription, ObjectFilesTable, ObjectHeader, ObjectsCloud } from '@/components/pages/objects'
import { removeMarkdown, sliceText } from '@/utils/strings'

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

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const { data: objectFilesData, isLoading: objectFilesLoading } = API.useFilesGetListQuery(objectName, {
        skip: !objectName
    })

    const allObjectsNames = useMemo(() => objectsList?.map(({ name }) => name), [objectsList])

    const handleEdit = async () => {
        if (objectName) {
            await router.push(`/objects/form/?id=${objectName}`)
        }
    }

    const handleCreate = async () => {
        await router.push('/objects/form')
    }

    return (
        <AppLayout>
            <NextSeo
                title={objectData?.title || objectName}
                description={sliceText(removeMarkdown(objectData?.description), 160)}
                canonical={`${canonicalUrl}objects/${objectName}`}
                openGraph={{
                    images: [
                        {
                            height: 244,
                            url: objectData?.image ? `${HOST_IMG}${objectData?.image}` : 'images/no-photo.png',
                            width: 487
                        }
                    ],
                    siteName: t('look-at-the-stars'),
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
                {userRole === ApiModel.UserRole.ADMIN && (
                    <>
                        <Button
                            icon={'Pencil'}
                            mode={'secondary'}
                            label={t('edit')}
                            size={'large'}
                            disabled={!objectName}
                            onClick={handleEdit}
                        />

                        <Button
                            icon={'PlusCircle'}
                            mode={'secondary'}
                            size={'large'}
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

            {!!objectData?.description?.length && <ObjectDescription text={objectData?.description} />}

            {!!photosList?.length && <ObjectPhotoTable photosList={photosList} />}

            <VisibilityChart object={objectData} />

            <ObjectFilesTable
                filesList={objectFilesData?.items}
                loading={objectFilesLoading}
            />

            {!!allObjectsNames?.length && (
                <ObjectsCloud
                    objectNamesList={allObjectsNames}
                    selectedObject={objectName}
                />
            )}

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<ObjectItemPageProps>> => {
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

            const { data: objectsList } = await store.dispatch(API.endpoints?.objectsGetList.initiate())

            const { data: categoriesData } = await store.dispatch(API.endpoints?.categoriesGetList.initiate())

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
