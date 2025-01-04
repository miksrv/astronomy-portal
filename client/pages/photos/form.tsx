import { API, ApiType } from '@/api'
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

// TODO: Добавить проерку на редактирование фото - сохранять только если есть изменения
const PhotoFormPage: NextPage<PhotoFormPageProps> = () => {
    const router = useRouter()
    const { t, i18n } = useTranslation()

    const { id } = router.query

    const {
        data: photoData,
        isLoading: photoLoading
        // isError
    } = API.usePhotosGetItemQuery(id as string, {
        skip: !id
    })

    const [
        createPhoto,
        {
            data: createdData,
            error: createError,
            isLoading: createLoading,
            isSuccess: createSuccess
        }
    ] = API.usePhotosPostMutation()

    const [
        updatePhoto,
        {
            data: updatedData,
            error: updateError,
            isLoading: updateLoading,
            isSuccess: updateSuccess
        }
    ] = API.usePhotoPatchMutation()

    const [
        uploadPhoto,
        {
            data: uploadedData,
            error: uploadError,
            isLoading: uploadLoading,
            isSuccess: uploadSuccess
        }
    ] = API.usePhotosPostUploadMutation()

    const handleSubmit = (formData?: AstroPhotoFormType) => {
        if (!formData) {
            return
        }

        // const formDataObject = new FormData()
        //
        // if (formData?.id) formDataObject.append('id', formData.id)
        // if (formData?.categories)
        //     formDataObject.append(
        //         'categories',
        //         JSON.stringify(formData.categories)
        //     )
        // if (formData?.objects)
        //     formDataObject.append('objects', JSON.stringify(formData.objects))
        // if (formData?.equipments)
        //     formDataObject.append(
        //         'equipments',
        //         JSON.stringify(formData.equipments)
        //     )
        // if (formData?.date) formDataObject.append('date', formData.date)
        // if (formData?.filters)
        //     formDataObject.append('filters', JSON.stringify(formData.filters))

        if (formData?.id) {
            updatePhoto(formData as ApiType.Photos.PostRequest)
        } else {
            createPhoto(formData as ApiType.Photos.PostRequest)
        }

        if (formData?.upload && formData?.id) {
            const formDataObject = new FormData()
            formDataObject.append('id', formData.id)
            formDataObject.append('file', formData.upload)
            uploadPhoto(formDataObject)
        }
    }

    const handleCancel = () => {
        router.back()
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
            <div className={'toolbarHeader'}>
                <h1 className={'pageTitle'}>
                    {'Добавление / редактирование астро фотографий'}
                </h1>
            </div>
            <AstroPhotoForm
                disabled={
                    photoLoading ||
                    createLoading ||
                    updateLoading ||
                    updateLoading
                }
                initialData={photoData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
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
