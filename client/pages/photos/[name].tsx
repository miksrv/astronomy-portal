import { API, ApiModel, useAppSelector } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { createPhotoTitle } from '@/tools/photos'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import React, { useMemo } from 'react'
import { Button } from 'simple-react-ui-kit'

import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import ObjectPhotoTable from '@/components/object-photos-table'
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
                    ) && photo.id !== photoData?.id
            ),
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
                    // images: [
                    //     {
                    //         height: 244,
                    //         url: catalog?.image
                    //             ? `${hosts.maps}${catalog?.image}`
                    //             : 'images/no-photo.png',
                    //         width: 487
                    //     }
                    // ],
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
                            label={t('edit')}
                            disabled={!photoId}
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

            <PhotoHeader
                {...photoData}
                photoTitle={photoTitle}
                objectsList={objectsList}
                categoriesList={categoriesList}
                equipmentsList={equipmentsList}
            />

            {!!filteredPhotosList?.length && (
                <ObjectPhotoTable photosList={filteredPhotosList} />
            )}
        </AppLayout>
    )
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
