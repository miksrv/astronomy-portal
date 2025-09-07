import React from 'react'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { AstronomyCalc, Calendar, Camera, RelayList, Weather } from '@/components/pages/observatory'

const ObservatoryPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const { data } = API.useStatisticGetTelescopeQuery()

    const title = t('pages.observatory.title', { defaultValue: 'Обсерватория' })
    const observatoryLink = t('pages.observatory.observatory-in-orenburg_link', {
        defaultValue: 'Обсерватория в Оренбурге'
    })

    return (
        <AppLayout
            canonical={'observatory'}
            title={title}
            description={t('pages.observatory.description', {
                defaultValue:
                    'Самодельная любительская астрономическая обсерватория с удаленным доступом из любой точки мира через интернет. Статистика работы обсерватории, количество отснятых кадров и накопленных данных. Календарь работы телескопа.'
            })}
            openGraph={{
                images: [
                    {
                        height: 854,
                        url: '/screenshots/observatory.jpg',
                        width: 1280
                    }
                ]
            }}
        >
            <AppToolbar
                title={title}
                currentPage={title}
            />

            <div>
                <p>
                    {t('pages.observatory.text', {
                        defaultValue:
                            'Наблюдение за Вселенной начинается здесь - в режиме реального времени вы можете увидеть текущие погодные условия, трансляцию с камер, статус оборудования и расписание съёмки. Обсерватория работает в полуавтоматическом режиме, позволяя вести съёмку deep-sky объектов удалённо. Здесь реализована система интеллектуального управления, анализирующая погодные условия и автоматически принимающая решение о начале работы. Подробнее об оборудовании и принципе работы можно узнать на отдельной странице:'
                    })}{' '}
                    <Link
                        href={'/observatory/overview'}
                        title={observatoryLink}
                    >
                        {observatoryLink}
                    </Link>
                    {'.'}
                </p>
            </div>

            <div className={'observatoryGrid'}>
                <div>
                    <Weather />
                    <AstronomyCalc />
                </div>
                <div>
                    <RelayList />
                </div>
            </div>

            <div className={'observatoryGrid'}>
                <Camera
                    cameraURL={`${process.env.NEXT_PUBLIC_API_HOST}/camera/2`}
                    interval={4}
                />

                <Camera
                    cameraURL={`${process.env.NEXT_PUBLIC_API_HOST}/camera/1`}
                    interval={30}
                />
            </div>

            {/*eslint-disable-next-line @typescript-eslint/no-explicit-any*/}
            <Calendar eventsTelescope={data?.items as any[]} />

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

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default ObservatoryPage
