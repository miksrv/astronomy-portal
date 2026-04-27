import React, { useMemo } from 'react'
import { Button } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, ApiModel, setLocale, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar, ObjectPhotoTable } from '@/components/common'
import { PhotoCloud, PhotoHeader } from '@/components/pages/photos'
import { createLargePhotoUrl, createPhotoTitle, normalizeAndFilterObjects } from '@/utils/photos'

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
    const { t } = useTranslation()

    const photoTitle = createPhotoTitle(photoData, t)

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const filteredPhotosList = useMemo(
        () => photosList?.filter((photo) => photo.objects?.some((object) => photoData?.objects?.includes(object))),
        [photosList, photoData?.objects]
    )

    const normalizeAndFilterPhotos = useMemo(() => normalizeAndFilterObjects(photosList), [photosList])

    const equipmentsDataDescription = useMemo(
        () =>
            equipmentsList
                ?.filter(({ id }) => photoData?.equipments?.includes(id))
                ?.map(({ brand, model }) => `${brand} ${model}`)
                ?.join('; '),
        [equipmentsList, photoData?.equipments]
    )

    return (
        <AppLayout
            canonical={`photos/${photoId}`}
            title={photoTitle}
            description={t(
                'pages.photo.description',
                '{{photoTitle}} - фотография астрономического объекта сделана на самодельной обсерватории, используемое оборудование: {{equipment}}.',
                { photoTitle, equipment: equipmentsDataDescription }
            )}
            openGraph={{
                images: [
                    {
                        height: 752,
                        url: createLargePhotoUrl(photoData),
                        width: 1000
                    }
                ]
            }}
        >
            <AppToolbar
                title={photoTitle}
                currentPage={photoTitle}
                links={[
                    {
                        link: '/photos',
                        text: t('menu.astrophoto', 'Астрофото')
                    }
                ]}
            >
                {userRole === ApiModel.UserRole.ADMIN && (
                    <>
                        <Button
                            icon={'Pencil'}
                            mode={'secondary'}
                            label={t('common.edit', 'Редактировать')}
                            disabled={!photoId}
                            link={`/photos/form/?id=${photoId}`}
                        />

                        <Button
                            icon={'PlusCircle'}
                            mode={'secondary'}
                            label={t('common.add', 'Добавить')}
                            link={'/photos/form'}
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

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<PhotoItemPageProps>> => {
            const locale = context.locale ?? 'en'
            const photoId = context.params?.name
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            if (typeof photoId !== 'string') {
                return { notFound: true }
            }

            const { data: photoData, isError } = await store.dispatch(API.endpoints?.photosGetItem.initiate(photoId))

            if (isError) {
                return { notFound: true }
            }

            const { data: objectsData } = await store.dispatch(API.endpoints?.objectsGetList.initiate())

            // Fetch a bounded set of photos for related-photo display (cover images only)
            const { data: photosData } = await store.dispatch(API.endpoints?.photosGetList.initiate())

            const { data: categoriesData } = await store.dispatch(API.endpoints?.categoriesGetList.initiate())

            const { data: equipmentsData } = await store.dispatch(API.endpoints?.equipmentsGetList.initiate())

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
