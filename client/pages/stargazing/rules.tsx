import React from 'react'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { ApiModel, setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'

const StargazingRulesPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const title = t('pages.stargazing-rules.title', { defaultValue: 'Правила поведения на астровыездах' })

    return (
        <AppLayout
            canonical={'stargazing/rules'}
            title={title}
            description={t('pages.stargazing-rules.description', {
                defaultValue:
                    'Узнайте правила поведения на астровыездах в Оренбурге: что нельзя делать при наблюдении звезд и планет в телескоп. Соблюдайте рекомендации, чтобы сделать астровыезд безопасным и комфортным для всех участников.'
            })}
        >
            <AppToolbar
                title={title}
                currentPage={title}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', { defaultValue: 'Астровыезды' })
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ margin: 0 }}>
                    {t('pages.stargazing-rules.welcome', {
                        defaultValue:
                            'Добро пожаловать на астровыезды в Оренбурге, организованные проектом «Смотри на звезды»! Чтобы совместное наблюдение звездного неба и планет прошло комфортно и безопасно для всех участников, важно соблюдать несколько простых правил. Эти рекомендации помогают сохранить атмосферу ночного наблюдения и гарантируют, что каждый сможет насладиться видом звезд и планет в телескоп.'
                    })}
                </p>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('pages.stargazing-rules.prohibited-title', {
                        defaultValue: 'Что нельзя делать на астровыездах'
                    })}
                    {':'}
                </h2>
                <ul style={{ listStyle: 'decimal', marginBottom: 0 }}>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.prohibited-items-1.title', {
                                defaultValue: 'Использовать яркие источники света'
                            })}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.prohibited-items-1.description', {
                                defaultValue:
                                    'Фонарики, экраны телефонов и любые яркие световые приборы нарушают адаптацию глаз к темноте, что снижает видимость звездного неба. Используйте только красные фонари или специальные светофильтры для устройств.'
                            })}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.prohibited-items-2.title', {
                                defaultValue: 'Разжигать костры и использовать открытый огонь'
                            })}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.prohibited-items-2.description', {
                                defaultValue:
                                    'Астровыезды проводятся в полях и открытых местах, где высокая вероятность пожаров. Разведение костров строго запрещено.'
                            })}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.prohibited-items-3.title', {
                                defaultValue: 'Употреблять алкоголь и курить'
                            })}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.prohibited-items-3.description', {
                                defaultValue:
                                    'Алкогольные напитки, сигареты, электронные сигареты, вейпы и кальяны запрещены. Это не только вопрос пожарной безопасности, но и уважение к другим участникам, для которых важно чистое ночное небо и свежий воздух.'
                            })}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.prohibited-items-4.title', {
                                defaultValue: 'Шуметь и мешать другим участникам'
                            })}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.prohibited-items-4.description', {
                                defaultValue:
                                    'Громкая музыка, крики или другие резкие звуки могут отвлекать и мешать концентрации при наблюдении в телескоп. Уважайте тишину и настрой окружающих.'
                            })}
                        </p>
                    </li>
                </ul>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('pages.stargazing-rules.recommendations-title', {
                        defaultValue: 'Рекомендации для участников астровыездов'
                    })}
                    {':'}
                </h2>
                <ul style={{ marginBottom: 0 }}>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.recommendations-items-1.title', {
                                defaultValue: 'Берегите природу'
                            })}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.recommendations-items-1.description', {
                                defaultValue:
                                    'Заберите с собой весь мусор после окончания наблюдений. Мы стараемся оставить места астровыездов такими же чистыми, какими они были до нашего приезда.'
                            })}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.recommendations-items-2.title', {
                                defaultValue: 'Соблюдайте правила техники безопасности'
                            })}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.recommendations-items-2.description', {
                                defaultValue:
                                    'Передвигайтесь аккуратно, чтобы избежать повреждений оборудования и не навредить себе.'
                            })}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.recommendations-items-3.title', {
                                defaultValue: 'Уважайте других участников'
                            })}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {t('pages.stargazing-rules.recommendations-items-3.description', {
                                defaultValue:
                                    'Каждый пришел на астровыезд, чтобы насладиться красотой космоса. Уважительное отношение друг к другу делает атмосферу дружелюбной и комфортной.'
                            })}
                        </p>
                    </li>
                </ul>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('pages.stargazing-rules.importance-title', { defaultValue: 'Почему важно соблюдать правила?' })}
                </h2>
                <p style={{ margin: 0 }}>
                    {t('pages.stargazing-rules.importance-description', {
                        defaultValue:
                            'Соблюдение этих рекомендаций помогает сделать наблюдение звездного неба в Оренбурге максимально комфортным для всех. Мы создаем атмосферу, где каждый участник может увидеть удивительные небесные явления, изучить планеты через телескоп и получить незабываемый опыт.'
                    })}
                </p>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('pages.stargazing-rules.join-title', { defaultValue: 'Присоединяйтесь к нашим астровыездам!' })}
                </h2>
                <p style={{ margin: 0 }}>
                    {t('pages.stargazing-rules.join-description', {
                        defaultValue: 'Хотите узнать больше о наших мероприятиях, организованных в Оренбурге?'
                    })}
                    <Link
                        style={{ margin: '0 5px' }}
                        href={'https://t.me/look_at_stars'}
                        title={t('telegram', { defaultValue: 'Телеграмм' })}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('pages.stargazing-rules.subscribe', { defaultValue: 'Подписывайтесь' })}
                    </Link>
                    {t('pages.stargazing-rules.join-description')}
                </p>
            </Container>

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

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default StargazingRulesPage
