import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import Link from 'next/link'
import React from 'react'
import { Container } from 'simple-react-ui-kit'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'

type StargazingWherePageProps = {}

const StargazingWherePage: NextPage<StargazingWherePageProps> = () => {
    const { t, i18n } = useTranslation()

    return (
        <AppLayout>
            <NextSeo
                title={t('stargazing-where')}
                description={
                    'Узнайте, где в Оренбурге можно посмотреть в телескоп. Тротуарная астрономия: бесплатные наблюдения Луны, планет и звезд на улицах города. Хотите увидеть больше — отправляйтесь на выезд за город для наблюдения туманностей и галактик!'
                }
                openGraph={{
                    images: [
                        // {
                        //     height: 853,
                        //     url: '/photos/stargazing-2.jpeg',
                        //     width: 1280
                        // }
                    ],
                    siteName: t('look-at-the-stars'),
                    title: t('stargazing-where'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('stargazing-where')}
                currentPage={t('stargazing-where')}
                links={[
                    {
                        link: '/stargazing',
                        text: t('stargazing')
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ marginTop: 0 }}>
                    {
                        'Тротуарная астрономия — это уникальный формат, благодаря которому космос становится ближе. Весной, летом и осенью мы выставляем телескопы прямо на тротуарах и площадях Оренбурга, чтобы любой желающий мог подойти и бесплатно взглянуть на звезды, планеты и Луну. Это отличная возможность для жителей города познакомиться с астрономией в непринужденной и дружественной атмосфере.'
                    }
                </p>
                <p style={{ marginBottom: 0 }}>
                    {
                        'Анонсы вечеров тротуарной астрономии мы почти всегда публикуем в нашем'
                    }
                    <Link
                        style={{ margin: '0 5px' }}
                        href={'https://t.me/nearspace'}
                        title={t('telegram')}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {'Telegram-канале'}
                    </Link>
                    {
                        ', но иногда наши телескопы можно встретить на улицах города и без предупреждения. Один из вдохновителей проекта, астролектор Владимир Иванович, нередко делится своими знаниями, показывая всем желающим интересные астрономические объекты. Просто ищите телескоп — и вы точно попадете на незабываемую экскурсию по звездному небу!'
                    }
                </p>
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {'Что можно увидеть в телескоп из города?'}
                </h2>
                <p>
                    {
                        'В условиях городского светового загрязнения наиболее яркие объекты остаются видимыми. Например, вы сможете рассмотреть:'
                    }
                </p>
                <ul>
                    <li>
                        {
                            'Кратеры и горы на Луне, особенно впечатляющие в фазах первой и последней четверти;'
                        }
                    </li>
                    <li>
                        {'Кольца Сатурна, которые неизменно вызывают восторг;'}
                    </li>
                    <li>
                        {'Яркие звезды и двойные звезды, такие как Альбирео;'}
                    </li>
                    <li>
                        {
                            'Парады планет, если они происходят в подходящее время года.'
                        }
                    </li>
                </ul>
                <p style={{ marginBottom: 0 }}>
                    {
                        'Однако городское освещение ограничивает наши возможности. Туманности, галактики, метеорные потоки и даже крупные звездные скопления часто остаются скрытыми от взгляда.'
                    }
                </p>
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {'Хотите увидеть больше? Выезжайте за город!'}
                </h2>
                <p>
                    {
                        'Для наблюдения слабосветящихся объектов, таких как туманности Ориона, Андромеды, метеорные потоки и звездные скопления, необходимо отправиться подальше от городских огней. В таких местах, как Оренбургская степь или другие удаленные районы, ночное небо поражает своей красотой.'
                    }
                </p>
                <p>
                    {
                        'Мы регулярно организуем выездные астрономические мероприятия, где можно насладиться полной палитрой космических объектов. Следите за анонсами на нашей странице «Астровыезды» или в Telegram-канале, чтобы присоединиться к одному из таких наблюдений.'
                    }
                </p>
                <p style={{ marginBottom: 0 }}>
                    {'Пусть звезды станут ближе!'}
                </p>
            </Container>

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<StargazingWherePageProps>> => {
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

export default StargazingWherePage
