import React, { useEffect, useState } from 'react'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, ApiType, wrapper } from '@/api'
import { AppLayout, AppToolbar } from '@/components/common'
import { CheckinResult, CheckinResultStatus, QrScanner } from '@/components/pages/stargazing'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { getErrorMessage } from '@/utils/errors'
import { extractBookingIdFromScan } from '@/utils/strings'

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

    const [checkin, { data, error, isError, isSuccess }] = API.useEventGetCheckinMutation()

    const handleScanSuccess = async (decodedText: string) => {
        const code = extractBookingIdFromScan(decodedText)

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

    const handleScanFailure = (errorMessage: string) => {
        setStatus(ScannerStatusEnum.ERROR)
        setMessage(errorMessage)
        setScanning(false)
    }

    const handleContinue = () => {
        setStatus(ScannerStatusEnum.IDLE)
        setMessage('')
        setParticipant(undefined)
        setScanning(true)
    }

    useEffect(() => {
        if (isError) {
            setStatus(ScannerStatusEnum.ERROR)
            setMessage(getErrorMessage(error) || '')
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
                    <QrScanner
                        onScanSuccess={handleScanSuccess}
                        onScanFailure={handleScanFailure}
                    />
                )}

                {!scanning && (
                    <CheckinResult
                        status={
                            status === ScannerStatusEnum.SUCCESS
                                ? CheckinResultStatus.SUCCESS
                                : status === ScannerStatusEnum.DUPLICATE
                                  ? CheckinResultStatus.DUPLICATE
                                  : CheckinResultStatus.ERROR
                        }
                        message={message}
                        name={participant?.name}
                        adults={participant?.members?.adults}
                        children={participant?.members?.children}
                        continueLabel={t('pages.checkin.continue-scanning', 'Продолжить сканирование')}
                        onContinue={handleContinue}
                    />
                )}
            </Container>
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const guard = await requirePermissionSSR(store, context, ApiModel.Permission.EVENTS_CHECKIN, '/stargazing')

            if (!guard.ok) {
                return { redirect: guard.redirect }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...guard.translations
                }
            }
        }
)

export default CheckinPage
