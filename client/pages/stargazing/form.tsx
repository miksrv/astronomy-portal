import { API, useAppSelector } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import { Message } from 'simple-react-ui-kit'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import AstroStargazingForm, {
    AstroStargazingFormType
} from '@/components/astro-stargazing-form'

type StargazingFormPageProps = {}

const StargazingFormPage: NextPage<StargazingFormPageProps> = () => {
    const router = useRouter()

    const { id } = router.query
    const { t, i18n } = useTranslation()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const {
        data: eventData,
        isLoading: eventLoading
        // isError
    } = API.useEventGetItemQuery(id as string, {
        skip: !id
    })

    const [
        createEvent,
        {
            error: createError,
            isLoading: createLoading,
            isSuccess: createSuccess
        }
    ] = API.useEventCreatePostMutation()

    const handleSubmit = (data?: AstroStargazingFormType) => {
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

        createEvent(formDataObject)
    }

    const handleCancel = () => {
        router.back()
    }

    const currentPageTitle = eventData?.id
        ? 'Редактирование астровыезда'
        : 'Добавление астровыезда'

    useEffect(() => {
        if (userRole !== 'admin') {
            router.push('/stargazing')
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
                        link: '/stargazing',
                        text: t('stargazing')
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

            <AstroStargazingForm
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
        async (
            context
        ): Promise<GetServerSidePropsResult<StargazingFormPageProps>> => {
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
