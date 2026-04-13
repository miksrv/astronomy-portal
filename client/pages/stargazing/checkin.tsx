import React, { useEffect, useRef, useState } from 'react'
import { getCookie } from 'cookies-next'
import { Html5Qrcode } from 'html5-qrcode'
import { Button, Container, Message, Spinner } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, ApiType, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppLayout, AppToolbar } from '@/components/common'

enum ScannerStatusEnum {
    IDLE = 'idle',
    SUCCESS = 'success',
    ERROR = 'error',
    DUPLICATE = 'duplicate'
}

const CheckinPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const [status, setStatus] = useState<ScannerStatusEnum>(ScannerStatusEnum.IDLE)
    const [participant, setParticipant] = useState<ApiType.Events.ResCheckin>()
    const [message, setMessage] = useState<string>('')
    const [scanning, setScanning] = useState<boolean>(true)

    const scannerRef = useRef<Html5Qrcode | null>(null)

    const [checkin, { data, error, isError, isSuccess }] = API.useEventGetCheckinMutation()

    const startScanner = async () => {
        const scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner

        const cameras = await Html5Qrcode.getCameras()

        if (!cameras || !cameras.length) {
            setStatus(ScannerStatusEnum.ERROR)
            setMessage(t('pages.checkin.no-cameras', 'Камеры не найдены'))
        }

        await scanner.start(cameras[0].id, { fps: 10, qrbox: 250 }, handleScan, () => {})
    }

    const stopScanner = async () => {
        if (scannerRef.current) {
            await scannerRef.current.stop()
            scannerRef.current.clear()
            scannerRef.current = null
        }
    }

    const handleScan = async (decodedText: string) => {
        await stopScanner()
        const code = decodedText.trim()

        if (code.length !== 13) {
            setStatus(ScannerStatusEnum.ERROR)
            setMessage(t('pages.checkin.invalid-qr', 'Некорректный QR-код'))
            setParticipant(undefined)
            setScanning(false)

            return
        }

        await checkin(code)
        setScanning(false)
    }

    const handleContinue = async () => {
        setStatus(ScannerStatusEnum.IDLE)
        setMessage('')
        setParticipant(undefined)
        setScanning(true)
        await startScanner()
    }

    useEffect(() => {
        let cancelled = false

        if (scanning) {
            startScanner().catch((err: Error) => {
                if (!cancelled) {
                    setStatus(ScannerStatusEnum.ERROR)
                    setMessage(err.message)
                    setScanning(false)
                }
            })
        }

        return () => {
            cancelled = true
            void stopScanner()
        }
    }, [scanning])

    useEffect(() => {
        if (isError) {
            setStatus(ScannerStatusEnum.ERROR)
            setMessage((error as ApiType.ResError)?.messages?.error as string)
        }

        if (isSuccess) {
            setStatus(data?.checkin?.date ? ScannerStatusEnum.DUPLICATE : ScannerStatusEnum.SUCCESS)
            setMessage(t('pages.checkin.participant-registered', 'Участник зарегистрирован'))
            setParticipant(data)
        }
    }, [data, error])

    return (
        <AppLayout
            title={t('pages.checkin.title', 'Проверка участников')}
            nofollow={true}
            noindex={true}
        >
            <AppToolbar
                title={t('pages.checkin.title', 'Проверка участников')}
                currentPage={t('pages.checkin.title', 'Проверка участников')}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', 'Астровыезды')
                    }
                ]}
            />

            <Container>
                {scanning && (
                    <div
                        id={'qr-reader'}
                        className={'qrCodeScanner'}
                    >
                        <Spinner />
                    </div>
                )}

                {!scanning && (
                    <Message
                        type={
                            status === ScannerStatusEnum.SUCCESS
                                ? 'success'
                                : status === ScannerStatusEnum.DUPLICATE
                                  ? 'warning'
                                  : 'error'
                        }
                        title={message}
                    >
                        {status !== ScannerStatusEnum.ERROR && (
                            <div style={{ margin: '20px 0' }}>
                                {status === ScannerStatusEnum.DUPLICATE && (
                                    <div>
                                        <strong>
                                            {t('pages.checkin.duplicate-qr', 'Этот QR код уже был проверен ранее!')}
                                        </strong>
                                    </div>
                                )}
                                {t('pages.checkin.members-count', 'Взрослых: {{adults}}, детей: {{children}} чел.', {
                                    adults: participant?.members?.adults || 0,
                                    children: participant?.members?.children || 0
                                })}
                            </div>
                        )}
                        <Button
                            style={{ width: '100%' }}
                            mode={'secondary'}
                            onClick={handleContinue}
                        >
                            {t('pages.checkin.continue-scanning', 'Продолжить сканирование')}
                        </Button>
                    </Message>
                )}
            </Container>
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
                return { redirect: { destination: '/stargazing', permanent: false } }
            }

            const { data: authData } = await store.dispatch(API.endpoints.authGetMe.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            if (authData?.user?.role === ApiModel.UserRole.USER || !authData?.user?.role) {
                return { redirect: { destination: '/stargazing', permanent: false } }
            }

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default CheckinPage
