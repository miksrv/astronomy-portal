import React from 'react'
import { Container } from 'simple-react-ui-kit'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'

const StargazingRulesPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const { t: tPage } = useTranslation('stargazing-rules')

    const title = tPage('title', 'Правила поведения на астровыездах')

    return (
        <AppLayout
            canonical={'stargazing/rules'}
            title={title}
            description={tPage(
                'description',
                'Узнайте правила поведения на астровыездах в Оренбурге: что нельзя делать при наблюдении звезд и планет в телескоп. Соблюдайте рекомендации, чтобы сделать астровыезд безопасным и комфортным для всех участников.'
            )}
        >
            <AppToolbar
                title={title}
                currentPage={title}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', 'Астровыезды')
                    }
                ]}
            />

            <div>
                {tPage(
                    'welcome',
                    'Добро пожаловать на астровыезды в Оренбурге, организованные проектом «Смотри на звезды»! Чтобы совместное наблюдение звездного неба и планет прошло комфортно и безопасно для всех участников, важно соблюдать несколько простых правил. Эти рекомендации помогают сохранить атмосферу ночного наблюдения и гарантируют, что каждый сможет насладиться видом звезд и планет в телескоп.'
                )}
            </div>

            <h2>{tPage('prohibited-title', 'Что нельзя делать на астровыездах')}</h2>

            <Container>
                <ul style={{ listStyle: 'decimal', margin: 0, padding: '0 20px' }}>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {tPage('prohibited-items-1.title', 'Использовать яркие источники света')}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {tPage(
                                'prohibited-items-1.description',
                                'Фонарики, экраны телефонов и любые яркие световые приборы нарушают адаптацию глаз к темноте, что снижает видимость звездного неба. Используйте только красные фонари или специальные светофильтры для устройств.'
                            )}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {tPage('prohibited-items-2.title', 'Разжигать костры и использовать открытый огонь')}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {tPage(
                                'prohibited-items-2.description',
                                'Астровыезды проводятся в полях и открытых местах, где высокая вероятность пожаров. Разведение костров строго запрещено.'
                            )}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {tPage('prohibited-items-3.title', 'Употреблять алкоголь и курить')}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {tPage(
                                'prohibited-items-3.description',
                                'Алкогольные напитки, сигареты, электронные сигареты, вейпы и кальяны запрещены. Это не только вопрос пожарной безопасности, но и уважение к другим участникам, для которых важно чистое ночное небо и свежий воздух.'
                            )}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {tPage('prohibited-items-4.title', 'Шуметь и мешать другим участникам')}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {tPage(
                                'prohibited-items-4.description',
                                'Громкая музыка, крики или другие резкие звуки могут отвлекать и мешать концентрации при наблюдении в телескоп. Уважайте тишину и настрой окружающих.'
                            )}
                        </p>
                    </li>
                </ul>
            </Container>

            <h2>{tPage('recommendations-title', 'Рекомендации для участников астровыездов')}</h2>

            <Container>
                <ul style={{ listStyle: 'decimal', margin: 0, padding: '0 20px' }}>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>{tPage('recommendations-items-1.title', 'Берегите природу')}</h3>
                        <p style={{ margin: 0 }}>
                            {tPage(
                                'recommendations-items-1.description',
                                'Заберите с собой весь мусор после окончания наблюдений. Мы стараемся оставить места астровыездов такими же чистыми, какими они были до нашего приезда.'
                            )}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {tPage('recommendations-items-2.title', 'Соблюдайте правила техники безопасности')}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {tPage(
                                'recommendations-items-2.description',
                                'Передвигайтесь аккуратно, чтобы избежать повреждений оборудования и не навредить себе.'
                            )}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>
                            {tPage('recommendations-items-3.title', 'Уважайте других участников')}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {tPage(
                                'recommendations-items-3.description',
                                'Каждый пришел на астровыезд, чтобы насладиться красотой космоса. Уважительное отношение друг к другу делает атмосферу дружелюбной и комфортной.'
                            )}
                        </p>
                    </li>
                </ul>
            </Container>

            <h2>{tPage('importance-title', 'Почему важно соблюдать правила?')}</h2>

            <Container>
                {tPage(
                    'importance-description',
                    'Соблюдение этих рекомендаций помогает сделать наблюдение звездного неба в Оренбурге максимально комфортным для всех. Мы создаем атмосферу, где каждый участник может увидеть удивительные небесные явления, изучить планеты через телескоп и получить незабываемый опыт.'
                )}
            </Container>

            <h2>{tPage('join-title', 'Присоединяйтесь к нашим астровыездам!')}</h2>

            <Container>
                {tPage('join-description', 'Хотите узнать больше о наших мероприятиях, организованных в Оренбурге?')}
                <Link
                    style={{ margin: '0 5px' }}
                    href={'https://t.me/look_at_stars'}
                    title={t('common.telegram', 'Телеграм')}
                    rel={'noindex nofollow'}
                    target={'_blank'}
                >
                    {tPage('subscribe', 'Подписывайтесь')}
                </Link>
            </Container>

            <AppFooter />
        </AppLayout>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<object>> => {
            const locale = context.locale ?? 'ru'
            const translations = await serverSideTranslations(locale, ['translation', 'stargazing-rules'])

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                },
                revalidate: 86400
            }
        }
)

export default StargazingRulesPage
