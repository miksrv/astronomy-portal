import React, { useEffect } from 'react'

import type { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, setLocale, wrapper } from '@/api'
import { AppLayout } from '@/components/common'
import { MainSection } from '@/components/pages/index'

interface HomePageProps {
    photosList: ApiModel.Photo[]
}

const headerHeight = 50

const HomePage: NextPage<HomePageProps> = ({ photosList }) => {
    const { t } = useTranslation()

    useEffect(() => {
        const sections = document.querySelectorAll('section')

        const setSectionHeight = () => {
            const windowHeight = window.innerHeight
            const sectionHeight = windowHeight - headerHeight
            sections.forEach((section) => {
                ;(section as HTMLElement).style.height = `${sectionHeight}px`
            })
        }

        setSectionHeight()
        window.addEventListener('resize', setSectionHeight)

        return () => {
            window.removeEventListener('resize', setSectionHeight)
        }
    }, [])

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

    return (
        <AppLayout
            fullWidth={true}
            title={t('pages.index.title', 'Проект "Смотри на звёзды"')}
            description={t(
                'pages.index.description',
                'Смотри на звезды - уникальный проект в Оренбургской области: наблюдения в телескопы за городом, тротуарная астрономия, обсерватория в Оренбургской области и астрофотографии'
            )}
        >
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
