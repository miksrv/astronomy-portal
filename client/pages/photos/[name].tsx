import { API, ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { wrapper } from '@/api/store'
import { isOutdated, sliceText } from '@/functions/helpers'
import { GetServerSidePropsResult, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useMemo, useState } from 'react'
import { Accordion, Icon, Message } from 'semantic-ui-react'

import AppLayout from '@/components/app-layout'
import ObjectCloud from '@/components/object-cloud'
import PhotoSection from '@/components/photo-section'
import PhotoTable from '@/components/photo-table'

interface PhotoItemPageProps {
    object: string
    date: string
    photos: ApiModel.Photo[]
    catalog: ApiModel.Catalog | null
}

const PhotoItemPage: NextPage<PhotoItemPageProps> = ({
    object,
    date,
    photos,
    catalog
}) => {
    const [showSpoiler, setShowSpoiler] = useState<boolean>(false)

    const { data: photoObjects, isLoading: objectsLoading } =
        API.useStatisticGetPhotosItemsQuery()

    const photoItem: ApiModel.Photo | undefined = useMemo(
        () => photos?.find((photo) => photo.date === date) || photos?.[0],
        [photos, date]
    )

    const objectTitle = useMemo(
        () => catalog?.title || catalog?.name || object.toString(),
        [catalog, object]
    )

    return (
        <AppLayout>
            <NextSeo
                title={`${objectTitle} - Астрофотография${
                    date ? ` - ${date}` : ''
                }`}
                description={
                    'Описание астрофотографии: ' +
                    sliceText(catalog?.text ?? '', 200)
                }
                openGraph={{
                    images: [
                        {
                            height: 743,
                            url: `${hosts.photo}${photoItem?.image_name}_thumb.${photoItem?.image_ext}`,
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />
            <PhotoSection
                title={objectTitle}
                photo={photoItem}
                catalog={catalog ?? undefined}
            />
            <Message
                warning={true}
                hidden={!isOutdated(photos?.[0]?.date, catalog?.updated!)}
                className={'section'}
                icon={'warning sign'}
                header={'Новые данные'}
                content={
                    'Фотографии устарели - есть новые данные с телескопа, с помощью которых можно собрать новое изображение объекта'
                }
            />
            {catalog?.text && (
                <div className={'section box table'}>
                    <Accordion inverted>
                        <Accordion.Title
                            active={showSpoiler}
                            onClick={() => setShowSpoiler(!showSpoiler)}
                        >
                            <Icon name={'dropdown'} /> Описание объекта{' '}
                            {catalog?.name.replace(/_/g, ' ')}
                        </Accordion.Title>
                        <Accordion.Content active={showSpoiler}>
                            <div className={'textBlock'}>{catalog?.text}</div>
                        </Accordion.Content>
                    </Accordion>
                </div>
            )}
            <PhotoTable photos={photos} />
            <ObjectCloud
                loader={objectsLoading}
                current={object}
                names={photoObjects?.items}
                link={'photos'}
            />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<PhotoItemPageProps>> => {
            const object = context.params?.name
            const date = context.query?.date as string

            if (typeof object !== 'string') {
                return { notFound: true }
            }

            const { data: catalog } = await store.dispatch(
                API.endpoints?.catalogGetItem.initiate(object)
            )

            const { data: photos, isError } = await store.dispatch(
                API.endpoints?.photoGetList.initiate({ object })
            )

            if (isError) {
                return { notFound: true }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    catalog: catalog || null,
                    date: date ?? '',
                    object,
                    photos: photos?.items || []
                }
            }
        }
)

export default PhotoItemPage
