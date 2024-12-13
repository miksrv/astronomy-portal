import { API, ApiModel } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import React from 'react'
import { Button } from 'simple-react-ui-kit'

import AppLayout from '@/components/app-layout'
import PhotoGrid from '@/components/photo-grid'

interface PhotosPageProps {
    photosList: ApiModel.Photo[]
    photosCount: number
}

const PhotosPage: NextPage<PhotosPageProps> = ({ photosList, photosCount }) => {
    const { t, i18n } = useTranslation()
    const router = useRouter()

    // const [search, setSearch] = useState<string>('')
    // const [localCategories, setLocalCategories] = useState<number[]>([])

    // const listPhotos: ApiModel.Photo[] | undefined = useMemo(
    //     () =>
    //         photos?.filter((photo) => {
    //             const catalogItem = catalog?.find(
    //                 ({ name }) => name === photo.object
    //             )
    //
    //             return (
    //                 (search === '' ||
    //                     catalogItem?.name
    //                         .toLowerCase()
    //                         .includes(search.toLowerCase()) ||
    //                     catalogItem?.title
    //                         ?.toLowerCase()
    //                         .includes(search.toLowerCase())) &&
    //                 (!localCategories?.length ||
    //                     (catalogItem?.category &&
    //                         localCategories.includes(catalogItem.category)))
    //             )
    //         }),
    //     [photos, catalog, localCategories, search]
    // )

    const handleCreate = () => {
        router.push('/photos/form')
    }

    return (
        <AppLayout>
            <NextSeo
                title={t('astrophoto')}
                description={t('description-photos-list-page')}
                openGraph={{
                    images: [
                        {
                            height: 743,
                            url: '/screenshots/photos.jpg',
                            width: 1280
                        }
                    ],
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <div className={'toolbarHeader'}>
                <h1 className={'pageTitle'}>{t('astrophoto')}</h1>

                <div className={'toolbarActions'}>
                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        label={'Добавить'}
                        onClick={handleCreate}
                    />
                </div>
            </div>

            {/*<CatalogToolbar*/}
            {/*    search={search}*/}
            {/*    categories={categories}*/}
            {/*    onChangeSearch={setSearch}*/}
            {/*    onChangeCategories={setLocalCategories}*/}
            {/*/>*/}

            <PhotoGrid
                threeColumns={true}
                photosList={photosList}
                // catalog={catalog}
            />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<PhotosPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            const { data: photos } = await store.dispatch(
                API.endpoints?.photosGetList.initiate()
            )

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    photosCount: photos?.count || 0,
                    photosList: photos?.items || []
                }
            }
        }
)

export default PhotosPage
