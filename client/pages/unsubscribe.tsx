import React from 'react'
import { getCookie } from 'cookies-next'
import { Button, Container, Message, Spinner } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppLayout } from '@/components/common'

const UnsubscribePage: NextPage = () => {
    const { t } = useTranslation()
    const router = useRouter()
    const mail = typeof router.query.mail === 'string' ? router.query.mail : ''

    const { isFetching, isSuccess, isError } = API.useMailingUnsubscribeQuery(mail, {
        skip: !mail
    })

    const pageTitle = t('pages.unsubscribe.title', 'Отписка от рассылки')

    return (
        <AppLayout
            title={pageTitle}
            noindex={true}
            nofollow={true}
        >
            <div className={'centerPageContainer'}>
                <div className={'wrapper'}>
                    <Container>
                        <h1 className={'header'}>{pageTitle}</h1>
                        <p className={'description'}>
                            {t(
                                'pages.unsubscribe.description',
                                'Вы больше не будете получать письма с уведомлениями о новых мероприятиях.'
                            )}
                        </p>

                        {isFetching && (
                            <div className={'loaderWrapper'}>
                                <Spinner />
                            </div>
                        )}

                        {!isFetching && isSuccess && (
                            <Message type={'success'}>
                                {t('pages.unsubscribe.success', 'Вы успешно отписались от рассылки.')}
                            </Message>
                        )}

                        {!isFetching && isError && (
                            <Message type={'error'}>
                                {t(
                                    'pages.unsubscribe.error',
                                    'Не удалось выполнить отписку. Возможно, ссылка уже использована или устарела.'
                                )}
                            </Message>
                        )}

                        {!isFetching && (isSuccess || isError) && (
                            <Button
                                link={'/'}
                                mode={'secondary'}
                                label={t('common.go-to-home-page', 'На главную')}
                            />
                        )}
                    </Container>
                </div>
            </div>
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })
            const mail = context.query.mail

            store.dispatch(setLocale(locale))

            if (!mail) {
                return { redirect: { destination: '/', permanent: false } }
            }

            if (token) {
                store.dispatch(setSSRToken(token))
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default UnsubscribePage
