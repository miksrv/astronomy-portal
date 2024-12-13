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
import AstroObjectForm from '@/components/astro-object-form'
import { AstroPhotoFormType } from '@/components/astro-photo-form/AstroPhotoForm'

type ObjectFormPageProps = {}

// TODO: Добавить обработку ошибки, когда пытаемся отредактировать объект, которого нет
// TODO: Добавить индикатор загрузки когда загружаем редактируемый объет
// TODO: Для handleCancel добавить проверку на изменения в форме
const ObjectFormPage: NextPage<ObjectFormPageProps> = () => {
    const router = useRouter()

    const { id } = router.query
    const { t, i18n } = useTranslation()

    const {
        data: objectData,
        isLoading: objectLoading
        // isError
    } = API.useObjectsGetItemQuery(id as string, {
        skip: !id
    })

    const [
        createObject,
        {
            data: createdData,
            error: createError,
            isSuccess: createSuccess,
            isLoading: createLoading
        }
    ] = API.useObjectsPostMutation()

    const [
        updateObject,
        {
            data: updatedData,
            error: updateError,
            isSuccess: updateSuccess,
            isLoading: updateLoading
        }
    ] = API.useObjectsPatchMutation()

    const handleSubmit = (formData?: AstroPhotoFormType) => {
        if (!formData) {
            return
        }

        if (id) {
            updateObject(formData)
        } else {
            createObject(formData)
        }
    }

    const handleCancel = () => {
        router.back()
    }

    return (
        <AppLayout>
            <NextSeo
                title={'Добавление / редактирование астрономических объектов'}
                description={''}
            />
            <div className={'toolbarHeader'}>
                <h1 className={'pageTitle'}>
                    {'Добавление / редактирование астрономических объектов'}
                </h1>
            </div>
            <AstroObjectForm
                disabled={objectLoading || createLoading || updateLoading}
                initialData={objectData}
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
        ): Promise<GetServerSidePropsResult<ObjectFormPageProps>> => {
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

export default ObjectFormPage
