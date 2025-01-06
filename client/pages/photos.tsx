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
import AppToolbar from '@/components/app-toolbar'
import PhotoGrid from '@/components/photo-grid'

interface PhotosPageProps {
    photosList: ApiModel.Photo[]
}

const PhotosPage: NextPage<PhotosPageProps> = ({ photosList }) => {
    const { t, i18n } = useTranslation()
    const router = useRouter()

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

            <AppToolbar
                title={t('astrophoto')}
                currentPage={t('astrophoto')}
            >
                <Button
                    icon={'PlusCircle'}
                    mode={'secondary'}
                    label={t('add')}
                    onClick={handleCreate}
                />
            </AppToolbar>

            <PhotoGrid photosList={photosList} />
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
                    photosList: photos?.items || []
                }
            }
        }
)

export default PhotosPage
