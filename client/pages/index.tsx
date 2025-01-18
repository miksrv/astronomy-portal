import { API, ApiModel } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import type { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import React, { useEffect } from 'react'

import AppLayout from '@/components/app-layout'
import MainSection from '@/components/main-sections'

interface HomePageProps {
    photosList: ApiModel.Photo[]
}

const headerHeight = 50

const HomePage: NextPage<HomePageProps> = ({ photosList }) => {
    const { t, i18n } = useTranslation()

    useEffect(() => {
        const sections = document.querySelectorAll('section')
        const options = {
            root: null, // Весь viewport
            threshold: 0.1 // 50% секции должно быть видно, чтобы сработал скролл
        }

        const setSectionHeight = () => {
            const windowHeight = window.innerHeight
            const sectionHeight = windowHeight - headerHeight
            sections.forEach((section) => {
                ;(section as HTMLElement).style.height = `${sectionHeight}px`
            })
        }

        setSectionHeight()
        window.addEventListener('resize', setSectionHeight)

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const target = entry.target as HTMLElement // Приведение типа
                    window.scrollTo({
                        behavior: 'smooth', // Плавный скроллинг
                        top: target.offsetTop - headerHeight // Теперь offsetTop будет доступен
                    })
                }
            })
        }, options)

        sections.forEach((section) => {
            observer.observe(section)
        })

        return () => {
            observer.disconnect()
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
        <AppLayout fullWidth={true}>
            <NextSeo
                title={t('look-at-the-stars')}
                description={''}
                noindex={true}
                openGraph={{
                    siteName: t('look-at-the-stars'),
                    title: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
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
                API.endpoints?.photosGetList.initiate()
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
