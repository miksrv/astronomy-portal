'use client'

import React, { useEffect, useRef, useState } from 'react'
import { getCookie } from 'cookies-next'
import { Html5Qrcode } from 'html5-qrcode'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, useAppSelector } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { setSSRToken } from '@/api/authSlice'
import { wrapper } from '@/api/store'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'

type CheckinPageProps = object

const CheckinPage: NextPage<CheckinPageProps> = () => {
    const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle')
    const [message, setMessage] = useState('')
    const [participant, setParticipant] = useState<{ name: string; count: number } | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const divId = 'qr-reader'

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const [checkin, { data: checkinData, error: checkinError }] = API.useEventGetCheckinMutation()

    const initScanner = async (
        scanner: Html5Qrcode,
        onSuccess: (decodedText: string) => void,
        onError: (err: string) => void
    ) => {
        const cameras = await Html5Qrcode.getCameras()

        if (cameras && cameras.length) {
            await scanner.start(cameras[0].id, { fps: 10, qrbox: 250 }, onSuccess, onError)
        } else {
            throw new Error('Камеры не найдены')
        }
    }

    useEffect(() => {
        const scanner = new Html5Qrcode(divId)
        scannerRef.current = scanner

        const handleScan = async (decodedText: string) => {
            scanner.pause()
            const code = decodedText.trim()

            if (code.length !== 13) {
                setStatus('error')
                setMessage('Некорректный QR-код')
                return
            }

            try {
                await checkin(code)

                // if (result.status === 'ok') {
                //     setStatus('success')
                //     setParticipant({ name: result.name, count: result.count })
                //     setMessage('Участник найден')
                // } else if (result.status === 'duplicate') {
                //     setStatus('duplicate')
                //     setParticipant({ name: result.name, count: result.count })
                //     setMessage('Уже отмечен ранее')
                // } else {
                //     setStatus('error')
                //     setMessage('Не найден в списке')
                // }
            } catch (err: any) {
                setStatus('error')
                setMessage(err?.data?.message || 'Ошибка при запросе')
            }
        }

        initScanner(scanner, handleScan, () => {}).catch((err) => {
            setStatus('error')
            setMessage(err.message)
        })

        return () => {
            scanner.stop().catch(() => {})
        }
    }, [checkin])

    console.log('checkinData', checkinData)

    return (
        <AppLayout>
            <AppToolbar
                title={'Проверка участников'}
                currentPage={'Проверка участников'}
            />
            <Container>
                <div
                    id={divId}
                    className='mx-auto'
                ></div>

                {status !== 'idle' && (
                    <div
                        className={`mt-4 p-4 rounded text-white font-bold
          ${status === 'success' ? 'bg-green-500' : status === 'duplicate' ? 'bg-yellow-500' : 'bg-red-500'}`}
                    >
                        <p>{message}</p>
                        {participant && (
                            <p>
                                {participant.name} ({participant.count} чел.)
                            </p>
                        )}
                    </div>
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
