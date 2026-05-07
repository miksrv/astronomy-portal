import React from 'react'

import { GetStaticPropsResult, NextPage } from 'next'
import Head from 'next/head'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'
import { generateNextSeo } from 'next-seo/pages'

const Error404Page: NextPage = () => {
    const { t } = useTranslation()

    return (
        <main>
            <Head>{generateNextSeo({ title: t('pages.404.title', 'Ошибка 404 - Такой страницы не существует') })}</Head>
            <div className={'errorPage'}>
                <h1>{t('pages.404.heading', 'Houston, we have a problem')}</h1>
                <h2>{t('pages.404.subheading', 'Страница не найдена')}</h2>
                <p>
                    {t(
                        'pages.404.description',
                        'Возможно, страница, которую вы ищете, была удалена,\nпереименована или временно недоступна.'
                    )}
                </p>
            </div>
        </main>
    )
}

export const getStaticProps = async ({ locale }: { locale?: string }): Promise<GetStaticPropsResult<object>> => {
    const translations = await serverSideTranslations(locale ?? 'ru')

    return {
        props: {
            ...translations
        }
    }
}

export default Error404Page
