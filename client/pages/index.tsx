import React, { useEffect } from 'react'

import type { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'
import { JsonLdScript } from 'next-seo'

import { API, ApiModel, setLocale, SITE_LINK, wrapper } from '@/api'
import { AppLayout } from '@/components/common'
import { MainSection } from '@/components/pages/index'

interface HomePageProps {
    photosList: ApiModel.Photo[]
}

const HomePage: NextPage<HomePageProps> = ({ photosList }) => {
    const { t } = useTranslation()

    useEffect(() => {
        const headings = document.querySelectorAll('.animate')

        const options = {
            root: null,
            threshold: 0.1
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setTimeout(() => entry.target.classList.add('visible'), 400)
                    observer.unobserve(entry.target)
                }
            })
        }, options)

        headings.forEach((heading) => {
            observer.observe(heading)
        })

        return () => observer.disconnect()
    }, [])

    const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Смотри на звёзды',
        url: SITE_LINK,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_LINK}objects?search={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
        }
    }

    return (
        <AppLayout
            noTopMargin={true}
            canonical={''}
            title={t('pages.index.title', 'Проект "Смотри на звёзды"')}
            description={t(
                'pages.index.description',
                'Смотри на звезды - уникальный проект в Оренбургской области: наблюдения в телескопы за городом, тротуарная астрономия, обсерватория в Оренбургской области и астрофотографии'
            )}
            openGraph={{
                images: [{ url: '/images/index-hero.png', width: 1536, height: 1024 }]
            }}
        >
            <JsonLdScript
                scriptKey={'website'}
                data={websiteSchema}
            />
            <MainSection.Astrophotos photos={photosList} />
            <MainSection.Stargazing />
            <MainSection.Observatory />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<HomePageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            const { data: photos } = await store.dispatch(
                API.endpoints?.photosGetList.initiate({
                    limit: 3,
                    order: 'rand'
                })
            )

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    photosList: photos?.items || []
                }
            }
        }
)

export default HomePage
