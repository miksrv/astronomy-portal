import React, { useMemo } from 'react'
import { Button } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'
import { JsonLdScript } from 'next-seo'

import { API, ApiModel, SITE_LINK, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar, ObjectPhotoTable } from '@/components/common'
import { PhotoCloud, PhotoHeader } from '@/components/pages/photos'
import { formatDate, toISODateTime } from '@/utils/dates'
import { hasPermission } from '@/utils/permissions'
import { createLargePhotoUrl, createPhotoTitle, normalizeAndFilterObjects } from '@/utils/photos'
import { initSSRLocale } from '@/utils/ssrLocale'
import { formatObjectName } from '@/utils/strings'

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

    // The catalog names in `photoTitle` ("Фото IC 1805 от …") are not what people search for —
    // the <title> and the image's name use the objects' own titles ("Туманность Сердце (IC 1805)")
    const objectsTitles = photoData?.objects
        ?.map((name) => objectsList?.find((object) => object.name === name)?.title || formatObjectName(name))
        .join(', ')
    const seoTitle = t('pages.photo.seo-title', '{{objects}} — астрофото от {{date}}', {
        objects: objectsTitles,
        date: formatDate(photoData?.date, 'DD.MM.YYYY')
    })

    const user = useAppSelector((state) => state.auth?.user)

    const filteredPhotosList = useMemo(
        () => photosList?.filter((photo) => photo.objects?.some((object) => photoData?.objects?.includes(object))),
        [photosList, photoData?.objects]
    )

    const normalizeAndFilterPhotos = useMemo(() => normalizeAndFilterObjects(photosList), [photosList])

    const imageObjectSchema = useMemo(
        () =>
            photoData
                ? {
                      '@context': 'https://schema.org',
                      '@type': 'ImageObject',
                      '@id': `${SITE_LINK}photos/${photoId}`,
                      name: seoTitle,
                      contentUrl: createLargePhotoUrl(photoData),
                      width: photoData.imageWidth,
                      height: photoData.imageHeight,
                      url: `${SITE_LINK}photos/${photoId}`,
                      datePublished: toISODateTime(photoData.date),
                      dateModified: toISODateTime(photoData.updated?.date),
                      author: {
                          '@type': 'Organization',
                          name: 'Смотри на звёзды',
                          url: SITE_LINK
                      },
                      copyrightHolder: {
                          '@type': 'Organization',
                          name: 'Смотри на звёзды'
                      },
                      license: 'https://creativecommons.org/licenses/by-nc/4.0/',
                      // With `license`, makes the photo eligible for the "Licensable" badge in Google Images
                      acquireLicensePage: `${SITE_LINK}about`,
                      creditText: 'Смотри на звёзды'
                  }
                : null,
        [photoData, photoId, seoTitle]
    )

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
            title={seoTitle}
            description={t(
                'pages.photo.description',
                '{{photoTitle}}: астрофотография, снятая любительской обсерваторией в Оренбурге. Оборудование: {{equipment}}.',
                { photoTitle: objectsTitles, equipment: equipmentsDataDescription }
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
            <JsonLdScript
                scriptKey={'photo-image-object'}
                data={imageObjectSchema}
            />
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
                {hasPermission(user, ApiModel.Permission.PHOTOS_MANAGE) && (
                    <>
                        <Button
                            icon={'Pencil'}
                            mode={'primary'}
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
            const { translations } = await initSSRLocale(store, context)
            const photoId = context.params?.name

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
