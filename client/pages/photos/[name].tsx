import { API, ApiModel, useAppSelector } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { createLargePhotoUrl, createPhotoTitle } from '@/tools/photos'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import React, { useMemo } from 'react'
import { Button } from 'simple-react-ui-kit'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import ObjectPhotoTable from '@/components/object-photos-table'
import PhotoCloud from '@/components/photo-cloud'
import PhotoHeader from '@/components/photo-header'

interface PhotoItemPageProps {
    photoId: string
    photoData?: ApiModel.Photo
    photosList?: ApiModel.Photo[]
    objectsList?: ApiModel.Object[]
    categoriesList?: ApiModel.Category[]
    equipmentsList?: ApiModel.Equipment[]
}

const PhotoItemPage: NextPage<PhotoItemPageProps> = ({
    photoId,
    photoData,
    photosList,
    objectsList,
    categoriesList,
    equipmentsList
}) => {
    const { t, i18n } = useTranslation()
    const router = useRouter()

    const photoTitle = createPhotoTitle(photoData, t)

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const filteredPhotosList = useMemo(
        () =>
            photosList?.filter(
                (photo) =>
                    photo.objects?.some((object) =>
                        photoData?.objects?.includes(object)
                    ) // && photo.id !== photoData?.id
            ),
        [photosList]
    )

    const normalizeAndFilterPhotos = useMemo(
        () => normalizeAndFilterObjects(photosList),
        [photosList]
    )

    const handleEdit = () => {
        if (photoId) {
            router.push(`/photos/form/?id=${photoId}`)
        }
    }

    const handleCreate = () => {
        router.push('/photos/form')
    }

    return (
        <AppLayout>
            <NextSeo
                title={photoTitle}
                description={''}
                openGraph={{
                    images: [
                        {
                            height: 752,
                            url: createLargePhotoUrl(photoData),
                            width: 1000
                        }
                    ],
                    siteName: t('look-at-the-stars'),
                    title: photoTitle,
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={photoTitle}
                currentPage={photoTitle}
                links={[
                    {
                        link: '/photos',
                        text: t('astrophoto')
                    }
                ]}
            >
                {userRole === 'admin' && (
                    <>
                        <Button
                            icon={'Pencil'}
                            mode={'secondary'}
                            size={'medium'}
                            label={t('edit')}
                            disabled={!photoId}
                            onClick={handleEdit}
                        />

                        <Button
                            icon={'PlusCircle'}
                            mode={'secondary'}
                            size={'medium'}
                            label={t('add')}
                            onClick={handleCreate}
                        />
                    </>
                )}
            </AppToolbar>

            <PhotoHeader
                {...photoData}
                photoTitle={photoTitle}
                objectsList={objectsList}
                categoriesList={categoriesList}
                equipmentsList={equipmentsList}
            />

            {!!filteredPhotosList?.length && (
                <ObjectPhotoTable
                    photosList={filteredPhotosList}
                    currentPhotoId={photoId}
                />
            )}

            {!!normalizeAndFilterPhotos?.length && (
                <PhotoCloud
                    selectedObject={photoData?.objects?.[0]}
                    photosList={normalizeAndFilterPhotos?.map((item) => ({
                        object: item.objects?.[0],
                        photoId: item.id
                    }))}
                />
            )}

            <AppFooter />
        </AppLayout>
    )
}

const normalizeAndFilterObjects = (
    data?: ApiModel.Photo[]
): ApiModel.Photo[] => {
    const splitData = data?.flatMap((item) =>
        item?.objects?.map((obj) => ({
            ...item,
            objects: [obj]
        }))
    )

    const uniqueMap = splitData?.reduce<Record<string, ApiModel.Photo>>(
        (acc, item) => {
            if (!item) return acc // Ensure item is not undefined

            const key = item.objects?.[0] as string

            if (acc[key]) {
                const existingDate = new Date(acc[key]?.date ?? '')
                const currentDate = new Date(item.date ?? '')

                if (currentDate > existingDate) {
                    if (acc) {
                        acc[key] = item
                    }
                }
            } else {
                if (acc) {
                    acc[key] = item
                }
            }

            return acc
        },
        {}
    )

    return Object.values(uniqueMap ?? {})
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<PhotoItemPageProps>> => {
            const locale = context.locale ?? 'en'
            const photoId = context.params?.name
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            if (typeof photoId !== 'string') {
                return { notFound: true }
            }

            const { data: photoData, isError } = await store.dispatch(
                API.endpoints?.photosGetItem.initiate(photoId)
            )

            if (isError) {
                return { notFound: true }
            }

            const { data: objectsData } = await store.dispatch(
                API.endpoints?.objectsGetList.initiate()
            )

            const { data: photosData } = await store.dispatch(
                API.endpoints?.photosGetList.initiate()
            )

            const { data: categoriesData } = await store.dispatch(
                API.endpoints?.categoriesGetList.initiate()
            )

            const { data: equipmentsData } = await store.dispatch(
                API.endpoints?.equipmentsGetList.initiate()
            )

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    photoId,
                    photoData: photoData,
                    objectsList: objectsData?.items || [],
                    photosList: photosData?.items || [],
                    categoriesList: categoriesData?.items || [],
                    equipmentsList: equipmentsData?.items || []
                }
            }
        }
)

export default PhotoItemPage
