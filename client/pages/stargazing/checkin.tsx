'use client'

import React, { useEffect, useRef, useState } from 'react'
import { getCookie } from 'cookies-next'
import { Html5Qrcode } from 'html5-qrcode'
import { Button, Container, Message, Spinner } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'

import { API, ApiModel, ApiType, useAppSelector } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { setSSRToken } from '@/api/authSlice'
import { wrapper } from '@/api/store'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'

enum ScannerStatusEnum {
    IDLE = 'idle',
    SUCCESS = 'success',
    ERROR = 'error',
    DUPLICATE = 'duplicate'
}

type CheckinPageProps = object

const CheckinPage: NextPage<CheckinPageProps> = () => {
    const router = useRouter()

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
            setMessage('Камеры не найдены')
        }

        await scanner.start(cameras[0].id, { fps: 10, qrbox: 250 }, handleScan, () => {})
    }

    const userRole = useAppSelector((state) => state.auth?.user?.role)

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
            setMessage('Некорректный QR-код')
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
        if (scanning) {
            startScanner().catch((err) => {
                setStatus(ScannerStatusEnum.ERROR)
                setMessage(err.message)
                setScanning(false)
            })
        }

        return () => {
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
            setMessage('Участник зарегистрирован')
            setParticipant(data)
        }
    }, [data, error])

    useEffect(() => {
        if (userRole === ApiModel.UserRole.USER) {
            void router.push('/stargazing')
        }
    }, [userRole])

    return (
        <AppLayout>
            <NextSeo title={'Проверка участников'} />

            <AppToolbar
                title={'Проверка участников'}
                currentPage={'Проверка участников'}
                links={[
                    {
                        link: '/stargazing',
                        text: 'Астровыезды'
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
                                        <strong>Этот QR код уже был проверен ранее!</strong>
                                    </div>
                                )}
                                Взрослых: {participant?.members?.adults || 0}, детей:{' '}
                                {participant?.members?.children || 0} чел.
                            </div>
                        )}
                        <Button
                            style={{ width: '100%' }}
                            mode={'secondary'}
                            onClick={handleContinue}
                        >
                            {'Продолжить сканирование'}
                        </Button>
                    </Message>
                )}
            </Container>
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<CheckinPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

            if (token) {
                store.dispatch(setSSRToken(token))
            } else {
                return { notFound: true }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default CheckinPage
