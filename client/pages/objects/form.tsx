import React, { useEffect, useState } from 'react'
import { getCookie } from 'cookies-next'
import { Message } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { AstroObjectForm, AstroObjectFormType } from '@/components/pages/objects'
import { formatObjectName } from '@/utils/strings'

// TODO: Добавить обработку ошибки, когда пытаемся отредактировать объект, которого нет
// TODO: Добавить индикатор загрузки когда загружаем редактируемый объет
// TODO: Для handleCancel добавить проверку на изменения в форме
const ObjectFormPage: NextPage<object> = () => {
    const router = useRouter()

    const { id } = router.query
    const { t } = useTranslation()

    const [createdName, setCreatedName] = useState<string>()

    const {
        data: objectData,
        isLoading: objectLoading
        // isError
    } = API.useObjectsGetItemQuery(id as string, {
        skip: !id
    })

    const [createObject, { error: createError, isLoading: createLoading, isSuccess: createSuccess }] =
        API.useObjectsPostMutation()

    const [updateObject, { error: updateError, isLoading: updateLoading, isSuccess: updateSuccess }] =
        API.useObjectsPatchMutation()

    const handleSubmit = async (formData?: AstroObjectFormType) => {
        if (!formData) {
            return
        }

        if (id) {
            await updateObject(formData)
        } else {
            setCreatedName(formData.name)
            await createObject(formData)
        }
    }

    const handleCancel = () => {
        router.back()
    }

    useEffect(() => {
        if (createSuccess && createdName) {
            void router.push(`/objects/${createdName}`)
        }
    }, [createSuccess, createdName])

    const currentPageTitle = objectData?.name
        ? `Редактирование ${formatObjectName(objectData.name)}`
        : 'Добавление объекта'

    return (
        <AppLayout
            title={currentPageTitle}
            noindex={true}
            nofollow={true}
        >
            <AppToolbar
                title={currentPageTitle}
                currentPage={currentPageTitle}
                links={[
                    {
                        link: '/objects',
                        text: t('menu.objects', 'Объекты')
                    }
                ]}
            />

            {(createError || updateError || updateSuccess) && (
                <Message
                    style={{ marginBottom: '10px' }}
                    type={createError || updateError ? 'error' : 'success'}
                >
                    {(createError || updateError) && <div>{'Ошибка сохранения'}</div>}
                    {updateSuccess && <div>{'Данные сохранены'}</div>}
                </Message>
            )}

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
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

            if (token) {
                store.dispatch(setSSRToken(token))
            } else {
                return { redirect: { destination: '/objects', permanent: false } }
            }

            const { data: authData } = await store.dispatch(API.endpoints.authGetMe.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            if (authData?.user?.role !== ApiModel.UserRole.ADMIN) {
                return { redirect: { destination: '/objects', permanent: false } }
            }

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default ObjectFormPage
