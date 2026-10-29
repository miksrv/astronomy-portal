import React, { useMemo } from 'react'
import { Button } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'
import { JsonLdScript } from 'next-seo'

import { API, ApiModel, HOST_IMG, SITE_LINK, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar, ObjectPhotoTable, VisibilityChart } from '@/components/common'
import { ObjectDescription, ObjectFilesTable, ObjectHeader, ObjectsCloud } from '@/components/pages/objects'
import { toISODateTime } from '@/utils/dates'
import { createPageUrl } from '@/utils/helpers'
import { hasPermission } from '@/utils/permissions'
import { createLargePhotoUrl } from '@/utils/photos'
import { initSSRLocale } from '@/utils/ssrLocale'
import { createSeoDescription, formatObjectName } from '@/utils/strings'

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

    const user = useAppSelector((state) => state.auth?.user)

    const { data: objectFilesData, isLoading: objectFilesLoading } = API.useFilesGetListQuery(objectName, {
        skip: !objectName
    })

    const allObjectsNames = useMemo(() => objectsList?.map(({ name }) => name), [objectsList])

    const title = objectData?.title || formatObjectName(objectName)
    const description = createSeoDescription(objectData?.description)
    const pageUrl = createPageUrl(i18n.language, `objects/${objectName}`)

    // People find these pages by the object's name ("туманность сердце", "ngc 7331") and
    // mostly want to see it, so the <title> promises the photos when there are any
    const seoTitle = photosList?.length
        ? t('pages.object.seo-title-photos', '{{title}}: фото и описание', { title })
        : t('pages.object.seo-title', '{{title}}: описание и координаты', { title })

    // The object's own astrophotos make a far better preview / rich-result image than the
    // generated star chart in `objectData.image`, which stays the fallback
    const images = useMemo(
        () =>
            photosList?.length
                ? photosList.slice(0, 3).map((photo) => ({
                      url: createLargePhotoUrl(photo),
                      width: photo.imageWidth,
                      height: photo.imageHeight,
                      alt: title
                  }))
                : [
                      {
                          url: objectData?.image ? `${HOST_IMG}${objectData.image}` : 'images/no-photo.png',
                          width: 487,
                          height: 244,
                          alt: title
                      }
                  ],
        [photosList, objectData?.image, title]
    )

    const articleSchema = useMemo(
        () => ({
            '@context': 'https://schema.org',
            '@type': 'Article',
            '@id': pageUrl,
            mainEntityOfPage: pageUrl,
            headline: title,
            description,
            image: images.map(({ url }) => (url.startsWith('http') ? url : `${SITE_LINK}${url}`)),
            url: pageUrl,
            inLanguage: i18n.language === 'en' ? 'en' : 'ru',
            dateModified: toISODateTime(objectData?.updated?.date),
            about: {
                '@type': 'Thing',
                name: title,
                alternateName: formatObjectName(objectName)
            },
            author: {
                '@type': 'Organization',
                name: 'Смотри на звёзды',
                url: SITE_LINK
            },
            publisher: {
                '@type': 'Organization',
                name: 'Смотри на звёзды',
                url: SITE_LINK,
                logo: {
                    '@type': 'ImageObject',
                    url: `${SITE_LINK}android-chrome-192x192.png`
                }
            }
        }),
        [objectData, objectName, title, description, images, pageUrl, i18n.language]
    )

    return (
        <AppLayout
            canonical={`objects/${objectName}`}
            title={seoTitle}
            description={description}
            openGraph={{ type: 'article', images }}
        >
            <JsonLdScript
                scriptKey={'object-article'}
                data={articleSchema}
            />
            <AppToolbar
                title={title}
                currentPage={title}
                links={[
                    {
                        link: '/objects',
                        text: t('menu.objects', 'Объекты')
                    }
                ]}
            >
                {hasPermission(user, ApiModel.Permission.OBJECTS_MANAGE) && (
                    <>
                        <Button
                            icon={'Pencil'}
                            mode={'primary'}
                            label={t('common.edit', 'Редактировать')}
                            disabled={!objectName}
                            link={`/objects/form/?id=${objectName}`}
                        />

                        <Button
                            icon={'PlusCircle'}
                            mode={'secondary'}
                            label={t('common.add', 'Добавить')}
                            link={'/objects/form'}
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
            const { translations } = await initSSRLocale(store, context)
            const objectName = context.params?.name

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
