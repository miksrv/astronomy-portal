import React, { useEffect } from 'react'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'

import { API, ApiModel, setLocale, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { AstroObjectForm, AstroObjectFormType } from '@/components/pages/objects'
import { formatObjectName } from '@/utils/strings'

type ObjectFormPageProps = object

// TODO: Добавить обработку ошибки, когда пытаемся отредактировать объект, которого нет
// TODO: Добавить индикатор загрузки когда загружаем редактируемый объет
// TODO: Для handleCancel добавить проверку на изменения в форме
// TODO: Добавить Message компонент для обработки выполнения действий
const ObjectFormPage: NextPage<ObjectFormPageProps> = () => {
    const router = useRouter()

    const { id } = router.query
    const { t, i18n } = useTranslation()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

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
            // data: createdData,
            // error: createError,
            // isSuccess: createSuccess,
            isLoading: createLoading
        }
    ] = API.useObjectsPostMutation()

    const [
        updateObject,
        {
            // data: updatedData,
            // error: updateError,
            // isSuccess: updateSuccess,
            isLoading: updateLoading
        }
    ] = API.useObjectsPatchMutation()

    const handleSubmit = async (formData?: AstroObjectFormType) => {
        if (!formData) {
            return
        }

        if (id) {
            await updateObject(formData)
        } else {
            await createObject(formData)
        }
    }

    const handleCancel = () => {
        router.back()
    }

    const currentPageTitle = objectData?.name
        ? `Редактирование ${formatObjectName(objectData.name)}`
        : 'Добавление объекта'

    useEffect(() => {
        if (userRole !== ApiModel.UserRole.ADMIN) {
            void router.push('/objects')
        }
    }, [userRole])

    return (
        <AppLayout>
            <NextSeo
                title={currentPageTitle}
                description={''}
                noindex={true}
                nofollow={true}
                openGraph={{
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={currentPageTitle}
                currentPage={currentPageTitle}
                links={[
                    {
                        link: '/objects',
                        text: t('objects')
                    }
                ]}
            />

            <AstroObjectForm
                disabled={objectLoading || createLoading || updateLoading}
                initialData={objectData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
            />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<ObjectFormPageProps>> => {
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
