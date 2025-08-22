import React, { useEffect } from 'react'
import { Message } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, setLocale, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { EventForm, EventFormType } from '@/components/pages/stargazing'

const StargazingFormPage: NextPage<object> = () => {
    const router = useRouter()

    const { id } = router.query
    const { t } = useTranslation()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const {
        data: eventData,
        isLoading: eventLoading
        // isError
    } = API.useEventGetItemQuery(id as string, {
        skip: !id
    })

    const [createEvent, { error: createError, isLoading: createLoading, isSuccess: createSuccess }] =
        API.useEventCreatePostMutation()

    const handleSubmit = async (data?: EventFormType) => {
        if (!data) {
            return
        }

        const formDataObject = new FormData()

        Object.entries(data || {}).forEach(([key, value]) => {
            if (key !== 'upload') {
                formDataObject.append(key, value as string)
            }

            if (key === 'upload' && value instanceof File) {
                formDataObject.append('upload', value)
            }
        })

        await createEvent(formDataObject)
    }

    const handleCancel = () => {
        router.back()
    }

    const currentPageTitle = eventData?.id ? 'Редактирование астровыезда' : 'Добавление астровыезда'

    useEffect(() => {
        if (userRole !== ApiModel.UserRole.ADMIN) {
            void router.push('/stargazing')
        }
    }, [userRole])

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
                        link: '/stargazing',
                        text: t('menu.stargazing', { defaultValue: 'Астровыезды' })
                    }
                ]}
            />

            {(createError || createSuccess) && (
                <Message
                    style={{ marginBottom: '10px' }}
                    type={createError ? 'error' : 'success'}
                >
                    {createError && <div>{'Ошибка сохранения'}</div>}
                    {createSuccess && <div>{'Астровыезд сохранен'}</div>}
                </Message>
            )}

            <EventForm
                disabled={eventLoading || createLoading || createSuccess}
                initialData={eventData}
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

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default StargazingFormPage
