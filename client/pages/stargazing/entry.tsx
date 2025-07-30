'use client'

import React, { useEffect } from 'react'
import QRCode from 'react-qr-code'
import { getCookie } from 'cookies-next'

import { GetServerSidePropsResult, NextPage } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { setSSRToken } from '@/api/authSlice'
import { wrapper } from '@/api/store'
import { formatUTCDate } from '@/tools/dates'

import styles from '@/styles/print.module.sass'

interface EntryPageProps {
    upcomingData: ApiModel.Event | null
}

const EntryPage: NextPage<EntryPageProps> = ({ upcomingData }) => {
    useEffect(() => {
        document.body.classList.add(styles.printBody)

        return () => {
            document.body.classList.remove(styles.printBody)
        }
    }, [])

    return (
        <div className={styles.center}>
            <h1>{'Это ваш билет на мероприятие'}</h1>
            <h2>{upcomingData?.title}</h2>
            <p>
                <strong>Дата и время:</strong> {formatUTCDate(upcomingData?.date?.date, 'D MMMM, YYYY, H:mm')}
            </p>
            <p>
                <strong>Участники:</strong> Взрослых {upcomingData?.members?.adults}, детей{' '}
                {upcomingData?.members?.children}
            </p>
            <p>
                <i>{'Покажите этот QR-код на входе'}</i>
            </p>
            <div className={styles.qrcode}>
                <QRCode
                    size={340}
                    value={upcomingData?.bookedId || ''}
                />
            </div>
            <button
                className={styles.printButton}
                onClick={() => window.print()}
            >
                {'Распечатать билет '}
            </button>
        </div>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<EntryPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

            if (token) {
                store.dispatch(setSSRToken(token))
            } else {
                return { notFound: true }
            }

            const { data: upcomingData } = await store.dispatch(API.endpoints?.eventGetUpcoming.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            if (!upcomingData?.registered) {
                return { notFound: true }
            }

            return {
                props: {
                    ...translations,
                    upcomingData: upcomingData || null
                }
            }
        }
)

export default EntryPage
