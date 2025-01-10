import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import type { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import Link from 'next/link'
import React, { useEffect } from 'react'

import AppLayout from '@/components/app-layout'

interface HomePageProps {}

const headerHeight = 50

const HomePage: NextPage<HomePageProps> = () => {
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

            <section style={{ height: '100%', position: 'relative' }}>
                <div
                    style={{
                        backgroundImage: 'url(/photos/stargazing-4.jpeg)',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'cover',
                        height: '100%',
                        position: 'absolute',
                        width: '100%'
                    }}
                />
                <div className={'textContainer'}>
                    <h2 className={'animate'}>Астровыезды</h2>
                    <p className={'animate'}>
                        Организуем регулярные поездки под открытое небо, чтобы
                        наблюдать за звездами и планетами через мощные
                        телескопы.
                    </p>
                    <Link
                        href='/stargazing'
                        className={'animate'}
                    >
                        Подробнее
                    </Link>
                </div>
            </section>
            <section style={{ height: '100%', position: 'relative' }}>
                <div
                    style={{
                        backgroundImage:
                            'url(https://api.astro.miksoft.pro/photos/NGC_281-2023.10.05.jpg)',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'cover',
                        height: '100%',
                        position: 'absolute',
                        width: '100%'
                    }}
                />
                <div className={'textContainer'}>
                    <h2 className={'animate'}>Астрофотографии</h2>
                    <p className={'animate'}>
                        Коллекция снимков космоса, сделанных на нашей
                        обсерватории, раскрывающая красоту далеких галактик,
                        туманностей и звездных скоплений.
                    </p>
                    <Link
                        href='/photos'
                        className={'animate'}
                    >
                        Подробнее
                    </Link>
                </div>
            </section>
            <section style={{ height: '100%', position: 'relative' }}>
                <div
                    style={{
                        backgroundImage: 'url(/photos/observatory-1.jpeg)',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'cover',
                        height: '100%',
                        position: 'absolute',
                        width: '100%'
                    }}
                />
                <div className={'textContainer'}>
                    <h2 className={'animate'}>Обсерватория</h2>
                    <p className={'animate'}>
                        Откройте для себя вселенную с нашего стационарного
                        наблюдательного пункта, оборудованного передовыми
                        телескопами.
                    </p>
                    <Link
                        href='/observatory'
                        className={'animate'}
                    >
                        Подробнее
                    </Link>
                </div>
            </section>
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<HomePageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default HomePage
