import * as LocalStorage from '@/tools/localstorage'
import { API, ApiType } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { login } from '@/api/authSlice'
import { useAppDispatch, useAppSelector, wrapper } from '@/api/store'
import { LOCAL_STORAGE } from '@/tools/constants'
import useLocalStorage from '@/tools/hooks/useLocalStorage'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/dist/client/router'
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { Button, Container, Message, Spinner } from 'simple-react-ui-kit'

interface AuthPageProps {}

const AuthPage: NextPage<AuthPageProps> = () => {
    const { t } = useTranslation()

    const dispatch = useAppDispatch()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [returnPath] = useLocalStorage<string>(LOCAL_STORAGE.RETURN_PATH)

    const code = searchParams.get('code')
    const service = searchParams.get('service')

    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const [sendRequest, setSendRequest] = useState<boolean>(false)

    const isAuth = useAppSelector((state) => state.auth.isAuth)

    const [serviceLogin, { data, error, isLoading, isError, isSuccess }] =
        API.useAuthLoginServiceMutation()

    useEffect(() => {
        if (isAuth && !data) {
            router.push('/')
        }
    })

    useEffect(() => {
        if (data?.auth === true && !isProcessing) {
            setIsProcessing(true)
            dispatch(login(data))

            if (returnPath) {
                const returnLink = returnPath

                LocalStorage.removeItem(LOCAL_STORAGE.RETURN_PATH as any)

                router.push(returnLink)
            } else {
                router.push('/')
            }
        }
    }, [data])

    useEffect(() => {
        setSendRequest(true)

        if (sendRequest && !!code?.length && !!service?.length) {
            serviceLogin({
                code,
                service: service as ApiType.Auth.AuthServiceType,
                state: searchParams.get('state') ?? undefined,
                device_id: searchParams.get('device_id') ?? undefined
            })
        }

        if ((!code || !service) && !sendRequest) {
            router.push('/')
        }
    }, [sendRequest])

    return (
        <>
            <NextSeo
                nofollow={true}
                noindex={true}
                title={t('authorization-on-site')}
            />
            <div className={'centerPageContainer'}>
                <div className={'wrapper'}>
                    <Container>
                        <h1 className={'header'}>
                            {t('authorization-on-site')}
                        </h1>
                        {error && (
                            <Message
                                type={'error'}
                                title={t('notification_error')}
                            >
                                {error as string}
                            </Message>
                        )}
                        {(isLoading || isSuccess || !isProcessing) && (
                            <div className={'loaderWrapper'}>
                                <Spinner />
                            </div>
                        )}
                        {isError && (
                            <Button
                                link={'/'}
                                size={'medium'}
                                mode={'primary'}
                            >
                                {t('go-to-home-page')}
                            </Button>
                        )}
                    </Container>
                </div>
            </div>
        </>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<AuthPageProps>> => {
            const locale = (context.locale ?? 'en') as ApiType.Locale
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default AuthPage
