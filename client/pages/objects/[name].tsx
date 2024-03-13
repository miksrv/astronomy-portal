import { API, ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { wrapper } from '@/api/store'
import { isOutdated, sliceText } from '@/functions/helpers'
import { GetServerSidePropsResult, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useMemo } from 'react'
import { Grid, Message } from 'semantic-ui-react'

import Coordinates from '@/components/charts/Coordinates'
import Deviation from '@/components/charts/Deviation'
import FilesQuality from '@/components/charts/FilesQuality'
import FilesTable from '@/components/files-table'
import ObjectCloud from '@/components/object-cloud'
import ObjectSection from '@/components/objects-section'
import PhotoTable from '@/components/photo-table'

interface ObjectItemPageProps {
    object: string
    photos: ApiModel.Photo[]
    catalog: ApiModel.Catalog
}

const ObjectItemPage: NextPage<ObjectItemPageProps> = ({
    object,
    photos,
    catalog
}) => {
    const { data: catalogObjects, isLoading: objectsLoading } =
        API.useStatisticGetCatalogItemsQuery()

    const objectTitle = useMemo(
        () => catalog?.title || catalog?.name || object.toString(),
        [catalog, object]
    )

    const filesSorted = useMemo(
        () =>
            [...(catalog?.files || [])]?.sort(
                (a, b) =>
                    new Date(a.date_obs).getTime() -
                    new Date(b.date_obs).getTime()
            ),
        [catalog?.files]
    )

    const deviationRa: number = useMemo(() => {
        if (!catalog?.files?.length) {
            return 0
        }

        const max = Math.max.apply(
            null,
            catalog?.files?.map(({ ra }) => ra) || []
        )
        const min = Math.min.apply(
            null,
            catalog?.files?.map(({ ra }) => ra) || []
        )

        return Math.round((max - min) * 100) / 100
    }, [catalog?.files])

    const deviationDec: number = useMemo(() => {
        if (!catalog?.files?.length) {
            return 0
        }

        const max = Math.max.apply(
            null,
            catalog?.files?.map(({ dec }) => dec) || []
        )
        const min = Math.min.apply(
            null,
            catalog?.files?.map(({ dec }) => dec) || []
        )

        return Math.round((max - min) * 100) / 100
    }, [catalog?.files])

    return (
        <main>
            <NextSeo
                title={`${objectTitle} - Объект`}
                description={
                    'Описание объекта наблюдения: ' +
                    sliceText(catalog?.text ?? '', 200)
                }
                openGraph={{
                    images: [
                        {
                            height: 244,
                            url: catalog?.image
                                ? `${hosts.maps}${catalog?.image}`
                                : 'images/no-photo.png',
                            width: 487
                        }
                    ],
                    locale: 'ru'
                }}
            />
            <ObjectSection
                title={objectTitle}
                catalog={catalog}
                deviationRa={deviationRa}
                deviationDec={deviationDec}
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
                <div className={'section box textBlock'}>{catalog?.text}</div>
            )}
            <PhotoTable photos={photos} />
            {!!catalog?.files?.length && (
                <Grid className={'section'}>
                    <Grid.Column
                        computer={6}
                        tablet={16}
                        mobile={16}
                        style={{ paddingBottom: '0' }}
                    >
                        <Deviation files={filesSorted} />
                    </Grid.Column>
                    <Grid.Column
                        computer={10}
                        tablet={16}
                        mobile={16}
                        style={{ paddingBottom: '0' }}
                    >
                        <Coordinates files={filesSorted} />
                    </Grid.Column>
                    {!!filesSorted?.filter(
                        ({ star_count, hfr }) => star_count && hfr
                    ).length && (
                        <Grid.Column
                            width={16}
                            style={{ paddingBottom: '0' }}
                        >
                            <FilesQuality files={filesSorted} />
                        </Grid.Column>
                    )}
                </Grid>
            )}
            <FilesTable
                objectName={object}
                files={catalog?.files}
            />
            <ObjectCloud
                loader={objectsLoading}
                current={object}
                names={catalogObjects?.items}
                link={'objects'}
            />
        </main>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<ObjectItemPageProps>> => {
            const object = context.params?.name

            if (typeof object !== 'string') {
                return { notFound: true }
            }

            const { data: catalog, isError } = await store.dispatch(
                API.endpoints?.catalogGetItem.initiate(object)
            )

            const { data: photos } = await store.dispatch(
                API.endpoints?.photoGetList.initiate({ object })
            )

            if (isError) {
                return { notFound: true }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    catalog: catalog!,
                    object,
                    photos: photos?.items || []
                }
            }
        }
)

export default ObjectItemPage
