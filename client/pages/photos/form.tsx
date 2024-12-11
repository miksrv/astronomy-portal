import { API } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import React from 'react'

import AppLayout from '@/components/app-layout'
import AstroPhotoForm from '@/components/astro-photo-form'
import { AstroPhotoFormType } from '@/components/astro-photo-form/AstroPhotoForm'

type PhotoFormPageProps = {}

const PhotoFormPage: NextPage<PhotoFormPageProps> = () => {
    const router = useRouter()
    const { t, i18n } = useTranslation()

    // const { id } = router.query

    // const { data, isLoading, isError } = API.usePhotosGetItemQuery(
    //     id as string,
    //     {
    //         skip: !id
    //     }
    // )

    const [savePhoto, { data, error, isLoading, isSuccess }] =
        API.usePhotosPostMutation()

    const handleSubmit = (formData?: AstroPhotoFormType) => {
        if (formData) {
            const formDataObject = new FormData()

            if (formData.categories)
                formDataObject.append(
                    'categories',
                    JSON.stringify(formData.categories)
                )
            if (formData.objects)
                formDataObject.append(
                    'objects',
                    JSON.stringify(formData.objects)
                )
            if (formData.equipment)
                formDataObject.append(
                    'equipment',
                    JSON.stringify(formData.equipment)
                )
            if (formData.date) formDataObject.append('date', formData.date)
            if (formData.filters)
                formDataObject.append(
                    'filters',
                    JSON.stringify(formData.filters)
                )

            if (formData.upload)
                formDataObject.append('upload', formData.upload)

            savePhoto(formDataObject as any)
        }
    }

    return (
        <AppLayout>
            <NextSeo
                title={'222'}
                description={'111'}
                noindex={true}
                openGraph={{
                    locale: 'ru'
                }}
            />

            <h1>{'Добавление / редактирование астро фотографий'}</h1>
            <AstroPhotoForm
                onSubmit={handleSubmit}
                disabled={isLoading}
            />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<PhotoFormPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default PhotoFormPage
