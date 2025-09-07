import React from 'react'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'

const StargazingFAQPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const title = t('pages.stargazing-faq.title', 'Часто задаваемые вопросы')

    return (
        <AppLayout
            canonical={'stargazing/faq'}
            title={title}
            description={t(
                'pages.stargazing-faq.description',
                'Узнайте ответы на частые вопросы об астровыездах: регистрация, что взять с собой, стоимость, длительность и как добраться. Готовьтесь к ночи под звездами с комфортом!'
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

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ marginTop: 0 }}>
                    {t(
                        'pages.stargazing-faq.description',
                        'Узнайте ответы на частые вопросы об астровыездах: регистрация, что взять с собой, стоимость, длительность и как добраться. Готовьтесь к ночи под звездами с комфортом!'
                    )}
                    <Link
                        href={'https://t.me/look_at_stars'}
                        style={{ marginLeft: '5px' }}
                        title={t('common.telegram', 'Телеграм')}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('common.look-at-the-stars', 'Смотри на звёзды')}
                    </Link>
                    {'.'}
                </p>
            </Container>
            {[
                {
                    question: t('pages.stargazing-faq.questions.where.question', '❓Как узнать, где проходит?'),
                    answer: t(
                        'pages.stargazing-faq.questions.where.answer',
                        'Наши астровыезды всегда проходят за городом. Обычно в пределах 40-70 км. Мы уезжаем от засветки и городских огней, чтобы увидеть звёзды. Точная локация доступна вам после регистрации. Если вдруг вы потеряли место локации - вернитесь на страницу регистрации снова по той же ссылке. Там есть геолокация - Яндекс.Карта и Google.Карта.'
                    )
                },
                {
                    question: t(
                        'pages.stargazing-faq.questions.registration.question',
                        '❓Можно ли приехать без регистрации?'
                    ),
                    answer: t(
                        'pages.stargazing-faq.questions.registration.answer',
                        'Нет, нельзя. Регистрация обязательна, так как она позволяет нам планировать мероприятие, уведомлять участников о возможных изменениях и обеспечивать комфорт для всех.'
                    )
                },
                {
                    question: t('pages.stargazing-faq.questions.qr.question', '❓Зачем нужен QR-код?'),
                    answer: t(
                        'pages.stargazing-faq.questions.qr.answer',
                        'QR-код – это ваш входной билет на наше мероприятие. Его будут проверять на въезде. Просим приготовить заранее, чтобы не создавать пробок на месте. Если у вас нет QR-кода – мы вынуждены вам отказать. QR-код – это наш способ регулировать количество участников астровыезда на площадке. Наш природный ланшафт, да и физические возможности команды имеют границы. Просим уважать это и отнестись с пониманием.'
                    )
                },
                {
                    question: t('pages.stargazing-faq.questions.what-to-bring.question', '❓Что брать с собой?'),
                    answer: t(
                        'pages.stargazing-faq.questions.what-to-bring.answer',
                        'Для комфортного пребывания на астроплощадке обязательно иметь с собой теплую одежду (мы в степи, ночью там ветер и холодно), туристический коврик, походные стулья, пледы. Рекомендуем также - термосы с чаем/кофе и бутерброды. Советуем взять репеллент от насекомых. Кальяны, шашлыки, алкоголь, сигареты – под запретом! А еще у нас самая чистая площадка. После астровыезда не находим ни одного фантика и бумажки и очень благодарим вас за это!'
                    )
                },
                {
                    question: t('pages.stargazing-faq.questions.no-car.question', '❓У меня нет машины, что делать?'),
                    answer: (
                        <>
                            {t(
                                'pages.stargazing-faq.questions.no-car.answer',
                                'Мы не организуем транспорт и не занимаемся перевозками. Наша задача – организовать крутое мероприятие, а ваша – на него приехать. Но для вашего удобства мы создали чат'
                            )}{' '}
                            <a
                                href='https://t.me/stargazing_oren'
                                rel='nofollow noopener'
                                target={'_blank'}
                                title={t('pages.stargazing-faq.questions.no-car.poputchiki', 'Астро.Попутчики')}
                            >
                                {t('pages.stargazing-faq.questions.no-car.poputchiki', 'Астро.Попутчики')}
                            </a>
                            {t(
                                'pages.stargazing-faq.questions.no-car.answer2',
                                '. Добавляйтесь, знакомьтесь и находите компанию. Там все классные, контактные, обязательные. Хотите общение на космические темы? Добавляйтесь в тематический'
                            )}{' '}
                            <a
                                href='https://t.me/all_astronomers'
                                rel='nofollow noopener'
                                target={'_blank'}
                                title={t('pages.stargazing-faq.questions.no-car.chat', 'Астро.Чат')}
                            >
                                {t('pages.stargazing-faq.questions.no-car.chat', 'Астро.Чат')}
                            </a>
                            {'!'}
                        </>
                    )
                },
                {
                    question: t(
                        'pages.stargazing-faq.questions.public-transport.question',
                        '❓Можно ли добраться до места проведения астровыезда на общественном транспорте?'
                    ),
                    answer: t(
                        'pages.stargazing-faq.questions.public-transport.answer',
                        'К сожалению, нет. Место проведения находится вдали от маршрутов общественного транспорта. Вы можете добраться туда на собственном автомобиле или присоединиться к другим участникам, если они готовы взять вас с собой. Мы рекомендуем договориться об этом заранее через наш Telegram-канал.'
                    )
                },
                {
                    question: t('pages.stargazing-faq.questions.start-time.question', '❓Во сколько начало?'),
                    answer: t(
                        'pages.stargazing-faq.questions.start-time.answer',
                        'В каждом анонсе астровыезда есть конкретное время начала. В этот раз это 21.30. Сбор гостей на площадке объявлен с 20.00 до 21.00. Это означает, что мы просим вас приехать к нам заранее – послушать музыку, сфотографироваться с Луной и в подсолнухах, посмотреть на закаты, надышаться степью. И что важно, припарковать автомобиль и не создавать пробок. Мы очень это ценим!'
                    )
                },
                {
                    question: t('pages.stargazing-faq.questions.price.question', '❓Сколько стоит?'),
                    answer: (
                        <>
                            {t(
                                'pages.stargazing-faq.questions.price.answer',
                                'Все наши астровыезды бесплатны. Проект растет и развивается и мы всегда рады поддержке от слушателей и подписчиков. Для этого есть'
                            )}{' '}
                            <a
                                href='https://pay.cloudtips.ru/p/6818d70d'
                                rel='nofollow noopener'
                                target={'_blank'}
                                title={t('pages.stargazing-faq.questions.price.donates', 'ДОНАТЫ')}
                            >
                                {t('pages.stargazing-faq.questions.price.donates', 'ДОНАТЫ')}
                            </a>
                            {t(
                                'pages.stargazing-faq.questions.price.answer2',
                                '. Хотите нас поддержать – мы будем вам признательны!'
                            )}
                        </>
                    )
                },
                {
                    question: t('pages.stargazing-faq.questions.duration.question', '❓Сколько длится астровыезд?'),
                    answer: t(
                        'pages.stargazing-faq.questions.duration.answer',
                        'В среднем официальная программа от начала лекции - до наблюдений в телескопы длится 2 часа. Но для вас они пролетят незаметно, гарантируем. А дальше вы сами выбираете – оставаться ли смотреть на небо с телескопами, или возвращаться домой. примерное время окончания: 00:30.'
                    )
                },
                {
                    question: t(
                        'pages.stargazing-faq.questions.weather.question',
                        '❓Что делать, если будет облачно или дождь?'
                    ),
                    answer: t(
                        'pages.stargazing-faq.questions.weather.answer',
                        'Если прогноз погоды неблагоприятный (облака или осадки), мероприятие может быть отменено или перенесено. Мы всегда предупреждаем участников о таких изменениях через наш Telegram-канал, поэтому обязательно следите за обновлениями.'
                    )
                },
                {
                    question: t(
                        'pages.stargazing-faq.questions.telescopes.question',
                        '❓Нужно ли приносить собственный телескоп?'
                    ),
                    answer: t(
                        'pages.stargazing-faq.questions.telescopes.answer',
                        'Нет, приносить телескоп не обязательно. У нас всегда есть несколько телескопов для общего пользования. Если у вас есть свой инструмент, вы можете взять его, и наши эксперты помогут вам с настройкой и использованием.'
                    )
                },
                {
                    question: t('pages.stargazing-faq.questions.kids.question', '❓Можно ли детям?'),
                    answer: t(
                        'pages.stargazing-faq.questions.kids.answer',
                        'Можно и нужно! Очень рады, когда подрастающее поколение интересуется наукой! Но есть рекомендованный возраст – от 6 лет. Поверьте нашему опыту.'
                    )
                },
                {
                    question: t('pages.stargazing-faq.questions.photo.question', '❓Можно ли фотографировать?'),
                    answer: t(
                        'pages.stargazing-faq.questions.photo.answer',
                        'Конечно! Вы можете делать фотографии, но просьба соблюдать правила этикета, чтобы не мешать другим участникам. Не используйте яркие вспышки или фонари, так как это может испортить ночное наблюдение.'
                    )
                },
                {
                    question: t('pages.stargazing-faq.questions.merch.question', '❓Как и где купить ваш мерч?'),
                    answer: t(
                        'pages.stargazing-faq.questions.merch.answer',
                        'На астрополяну везем худи, футболки, автонаклейки, открытки и стикерпаки. Хотите поддержать проект - купите наш мерч!'
                    )
                },
                {
                    question: t(
                        'pages.stargazing-faq.questions.cancel.question',
                        '❓Я зарегистрировался и не могу поехать. Что делать?'
                    ),
                    answer: t(
                        'pages.stargazing-faq.questions.cancel.answer',
                        'Просто отмените бронирование по прежней ссылке. На сайте появятся свободные слоты и люди смогут зарегистрироваться.'
                    )
                },
                {
                    question: t(
                        'pages.stargazing-faq.questions.more-people.question',
                        '❓Я зарегистрировал 1\\2\\3\\4\\5 человек, а можно ли взять больше?'
                    ),
                    answer: t(
                        'pages.stargazing-faq.questions.more-people.answer',
                        'Нет, нельзя. Наши правила едины для всех. По QR-коду на площадку проезжает то количество людей, которое вы зарегистрировали. Никак иначе.'
                    )
                },
                {
                    question: t(
                        'pages.stargazing-faq.questions.late-registration.question',
                        '❓Регистрация закончилась и я не успел (а). Можно я приеду? Пожалуйста!'
                    ),
                    answer: t(
                        'pages.stargazing-faq.questions.late-registration.answer',
                        'Нет, увы. Наши правила едины для всех. Мы не зря ввели систему регистраций и следим за въездом на астроплощадку.'
                    )
                },
                {
                    question: t(
                        'pages.stargazing-faq.questions.support.question',
                        '❓Вы мне нравитесь! Как вас поддержать?'
                    ),
                    answer: (
                        <>
                            {t('pages.stargazing-faq.questions.support.answer', 'У нас есть')}{' '}
                            <a
                                href='https://pay.cloudtips.ru/p/6818d70d'
                                rel='nofollow noopener'
                                target={'_blank'}
                                title={t('pages.stargazing-faq.questions.support.donates', 'ДОНАТЫ')}
                            >
                                {t('pages.stargazing-faq.questions.support.donates', 'донаты')}
                            </a>
                            {t(
                                'pages.stargazing-faq.questions.support.answer2',
                                '. Мы постоянно докупаем оборудование, обновляем технические возможности, создаем мерч и всякие активности. Ваша поддержка - это ❤︎❤︎❤︎'
                            )}
                        </>
                    )
                },
                {
                    question: t('pages.stargazing-faq.questions.feedback.question', '❓Где написать про вас отзыв?'),
                    answer: t(
                        'pages.stargazing-faq.questions.feedback.answer',
                        'Во всех социальных сетях наша группа называется "Смотри на звёзды". Мы ценим обратную связь и всегда читаем ваши отзывы. Спасибо вам за них!'
                    )
                }
            ].map((item, idx) => (
                <div key={idx}>
                    <h3 style={{ marginTop: 20, marginBottom: 5, fontSize: '18px' }}>{item.question}</h3>
                    <Container style={{ marginBottom: '10px' }}>{item.answer}</Container>
                </div>
            ))}

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

export default StargazingFAQPage
