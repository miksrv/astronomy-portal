import React from 'react'

import { GetStaticPropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'

const Error404Page: NextPage = () => {
    const { t } = useTranslation()

    return (
        <main>
            <NextSeo title={t('pages.404.title', 'Ошибка 404 - Такой страницы не существует')} />
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
