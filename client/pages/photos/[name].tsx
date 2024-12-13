import { API, ApiModel } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { hosts } from '@/api/constants'
import { wrapper } from '@/api/store'
import { isOutdated, sliceText } from '@/functions/helpers'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import React, { useMemo, useState } from 'react'
import { Accordion, Icon, Message } from 'semantic-ui-react'
import { Button } from 'simple-react-ui-kit'

import AppLayout from '@/components/app-layout'
import ObjectsCloud from '@/components/object-cloud'
import PhotoHeader from '@/components/photo-header'
import PhotoSection from '@/components/photo-section'

// import PhotoTable from '@/components/photo-table'

interface PhotoItemPageProps {
    photoId: string
    photoData?: ApiModel.Photo
    objectsList?: ApiModel.Object[]
    categoriesList?: ApiModel.Category[]
    equipmentsList?: ApiModel.Equipment[]
}

const PhotoItemPage: NextPage<PhotoItemPageProps> = ({
    photoId,
    photoData,
    objectsList,
    categoriesList,
    equipmentsList
}) => {
    const { t, i18n } = useTranslation()
    const router = useRouter()
    // const [showSpoiler, setShowSpoiler] = useState<boolean>(false)
    //
    // const { data: photoObjects, isLoading: objectsLoading } =
    //     API.useStatisticGetPhotosItemsQuery()
    //
    // const photoItem: ApiModel.Photo | undefined = useMemo(
    //     () => photos?.find((photo) => photo.date === date) || photos?.[0],
    //     [photos, date]
    // )
    //
    // const objectTitle = useMemo(
    //     () => catalog?.title || catalog?.name || object.toString(),
    //     [catalog, object]
    // )

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
                title={''}
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
                    // locale: 'ru'
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <div className={'toolbarHeader'}>
                <h1 className={'pageTitle'}>{'Придумать заголовок'}</h1>
                <div className={'toolbarActions'}>
                    <Button
                        icon={'Pencil'}
                        mode={'secondary'}
                        label={'Редактировать'}
                        disabled={!photoId}
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

            <PhotoHeader
                {...photoData}
                objectsList={objectsList}
                categoriesList={categoriesList}
                equipmentsList={equipmentsList}
            />
            {/*<NextSeo*/}
            {/*    title={`${objectTitle} - Астрофотография${*/}
            {/*        date ? ` - ${date}` : ''*/}
            {/*    }`}*/}
            {/*    description={*/}
            {/*        'Описание астрофотографии: ' +*/}
            {/*        sliceText(catalog?.text ?? '', 200)*/}
            {/*    }*/}
            {/*    // openGraph={{*/}
            {/*    //     images: [*/}
            {/*    //         {*/}
            {/*    //             height: 743,*/}
            {/*    //             url: `${hosts.photo}${photoItem?.image_name}_thumb.${photoItem?.image_ext}`,*/}
            {/*    //             width: 1280*/}
            {/*    //         }*/}
            {/*    //     ],*/}
            {/*    //     locale: 'ru'*/}
            {/*    // }}*/}
            {/*/>*/}
            {/*<PhotoSection*/}
            {/*    title={objectTitle}*/}
            {/*    photo={photoItem}*/}
            {/*    catalog={catalog ?? undefined}*/}
            {/*/>*/}
            {/*<Message*/}
            {/*    warning={true}*/}
            {/*    hidden={!isOutdated(photos?.[0]?.date, catalog?.updated!)}*/}
            {/*    className={'section'}*/}
            {/*    icon={'warning sign'}*/}
            {/*    header={'Новые данные'}*/}
            {/*    content={*/}
            {/*        'Фотографии устарели - есть новые данные с телескопа, с помощью которых можно собрать новое изображение объекта'*/}
            {/*    }*/}
            {/*/>*/}
            {/*{catalog?.text && (*/}
            {/*    <div className={'section box table'}>*/}
            {/*        <Accordion inverted>*/}
            {/*            <Accordion.Title*/}
            {/*                active={showSpoiler}*/}
            {/*                onClick={() => setShowSpoiler(!showSpoiler)}*/}
            {/*            >*/}
            {/*                <Icon name={'dropdown'} /> Описание объекта{' '}*/}
            {/*                {catalog?.name.replace(/_/g, ' ')}*/}
            {/*            </Accordion.Title>*/}
            {/*            <Accordion.Content active={showSpoiler}>*/}
            {/*                <div className={'textBlock'}>{catalog?.text}</div>*/}
            {/*            </Accordion.Content>*/}
            {/*        </Accordion>*/}
            {/*    </div>*/}
            {/*)}*/}
            {/*<PhotoTable photos={photos} />*/}
            {/*<ObjectsCloud*/}
            {/*    loader={objectsLoading}*/}
            {/*    current={object}*/}
            {/*    names={photoObjects?.items}*/}
            {/*    link={'photos'}*/}
            {/*/>*/}
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

            // const { data: photosData } = await store.dispatch(
            //     API.endpoints?.photosGetList.initiate({
            //         object: photoId
            //     })
            // )

            if (isError) {
                return { notFound: true }
            }

            const { data: objectsData } = await store.dispatch(
                API.endpoints?.objectsGetList.initiate()
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
                    categoriesList: categoriesData?.items || [],
                    equipmentsList: equipmentsData?.items || []
                }
            }
        }
)

export default PhotoItemPage
