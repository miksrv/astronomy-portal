import React, { useState } from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'

import styles from './faq.module.sass'

interface FaqItem {
    question: string
    answer: React.ReactNode
}

const StargazingFAQPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const { t: tPage } = useTranslation('stargazing-faq')
    const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]))

    const title = tPage('title', 'Часто задаваемые вопросы')

    const toggleItem = (idx: number) => {
        setOpenItems((prev) => {
            const next = new Set(prev)
            if (next.has(idx)) {
                next.delete(idx)
            } else {
                next.add(idx)
            }
            return next
        })
    }

    const faqItems: FaqItem[] = [
        {
            question: tPage('questions.where.question', '❓Как узнать, где проходит?'),
            answer: tPage(
                'questions.where.answer',
                'Наши астровыезды всегда проходят за городом. Обычно в пределах 40-70 км. Мы уезжаем от засветки и городских огней, чтобы увидеть звёзды. Точная локация доступна вам после регистрации. Если вдруг вы потеряли место локации - вернитесь на страницу регистрации снова по той же ссылке. Там есть геолокация - Яндекс.Карта и Google.Карта.'
            )
        },
        {
            question: tPage('questions.registration.question', '❓Можно ли приехать без регистрации?'),
            answer: tPage(
                'questions.registration.answer',
                'Нет, нельзя. Регистрация обязательна, так как она позволяет нам планировать мероприятие, уведомлять участников о возможных изменениях и обеспечивать комфорт для всех.'
            )
        },
        {
            question: tPage('questions.qr.question', '❓Зачем нужен QR-код?'),
            answer: tPage(
                'questions.qr.answer',
                'QR-код – это ваш входной билет на наше мероприятие. Его будут проверять на въезде. Просим приготовить заранее, чтобы не создавать пробок на месте. Если у вас нет QR-кода – мы вынуждены вам отказать. QR-код – это наш способ регулировать количество участников астровыезда на площадке. Наш природный ланшафт, да и физические возможности команды имеют границы. Просим уважать это и отнестись с пониманием.'
            )
        },
        {
            question: tPage('questions.what-to-bring.question', '❓Что брать с собой?'),
            answer: tPage(
                'questions.what-to-bring.answer',
                'Для комфортного пребывания на астроплощадке обязательно иметь с собой теплую одежду (мы в степи, ночью там ветер и холодно), туристический коврик, походные стулья, пледы. Рекомендуем также - термосы с чаем/кофе и бутерброды. Советуем взять репеллент от насекомых. Кальяны, шашлыки, алкоголь, сигареты – под запретом! А еще у нас самая чистая площадка. После астровыезда не находим ни одного фантика и бумажки и очень благодарим вас за это!'
            )
        },
        {
            question: tPage('questions.no-car.question', '❓У меня нет машины, что делать?'),
            answer: (
                <>
                    {tPage(
                        'questions.no-car.answer',
                        'Мы не организуем транспорт и не занимаемся перевозками. Наша задача – организовать крутое мероприятие, а ваша – на него приехать. Но для вашего удобства мы создали чат'
                    )}{' '}
                    <a
                        href={'https://t.me/stargazing_oren'}
                        rel={'nofollow noopener'}
                        target={'_blank'}
                        title={tPage('questions.no-car.poputchiki', 'Астро.Попутчики')}
                    >
                        {tPage('questions.no-car.poputchiki', 'Астро.Попутчики')}
                    </a>
                    {tPage(
                        'questions.no-car.answer2',
                        '. Добавляйтесь, знакомьтесь и находите компанию. Там все классные, контактные, обязательные. Хотите общение на космические темы? Добавляйтесь в тематический'
                    )}{' '}
                    <a
                        href={'https://t.me/all_astronomers'}
                        rel={'nofollow noopener'}
                        target={'_blank'}
                        title={tPage('questions.no-car.chat', 'Астро.Чат')}
                    >
                        {tPage('questions.no-car.chat', 'Астро.Чат')}
                    </a>
                    {'!'}
                </>
            )
        },
        {
            question: tPage(
                'questions.public-transport.question',
                '❓Можно ли добраться до места проведения астровыезда на общественном транспорте?'
            ),
            answer: tPage(
                'questions.public-transport.answer',
                'К сожалению, нет. Место проведения находится вдали от маршрутов общественного транспорта. Вы можете добраться туда на собственном автомобиле или присоединиться к другим участникам, если они готовы взять вас с собой. Мы рекомендуем договориться об этом заранее через наш Telegram-канал.'
            )
        },
        {
            question: tPage('questions.start-time.question', '❓Во сколько начало?'),
            answer: tPage(
                'questions.start-time.answer',
                'В каждом анонсе астровыезда есть конкретное время начала. В этот раз это 21.30. Сбор гостей на площадке объявлен с 20.00 до 21.00. Это означает, что мы просим вас приехать к нам заранее – послушать музыку, сфотографироваться с Луной и в подсолнухах, посмотреть на закаты, надышаться степью. И что важно, припарковать автомобиль и не создавать пробок. Мы очень это ценим!'
            )
        },
        {
            question: tPage('questions.price.question', '❓Сколько стоит?'),
            answer: (
                <>
                    {tPage(
                        'questions.price.answer',
                        'Все наши астровыезды бесплатны. Проект растет и развивается и мы всегда рады поддержке от слушателей и подписчиков. Для этого есть'
                    )}{' '}
                    <a
                        href={'https://pay.cloudtips.ru/p/6818d70d'}
                        rel={'nofollow noopener'}
                        target={'_blank'}
                        title={tPage('questions.price.donates', 'ДОНАТЫ')}
                    >
                        {tPage('questions.price.donates', 'ДОНАТЫ')}
                    </a>
                    {tPage('questions.price.answer2', '. Хотите нас поддержать – мы будем вам признательны!')}
                </>
            )
        },
        {
            question: tPage('questions.duration.question', '❓Сколько длится астровыезд?'),
            answer: tPage(
                'questions.duration.answer',
                'В среднем официальная программа от начала лекции - до наблюдений в телескопы длится 2 часа. Но для вас они пролетят незаметно, гарантируем. А дальше вы сами выбираете – оставаться ли смотреть на небо с телескопами, или возвращаться домой. примерное время окончания: 00:30.'
            )
        },
        {
            question: tPage('questions.weather.question', '❓Что делать, если будет облачно или дождь?'),
            answer: tPage(
                'questions.weather.answer',
                'Если прогноз погоды неблагоприятный (облака или осадки), мероприятие может быть отменено или перенесено. Мы всегда предупреждаем участников о таких изменениях через наш Telegram-канал, поэтому обязательно следите за обновлениями.'
            )
        },
        {
            question: tPage('questions.telescopes.question', '❓Нужно ли приносить собственный телескоп?'),
            answer: tPage(
                'questions.telescopes.answer',
                'Нет, приносить телескоп не обязательно. У нас всегда есть несколько телескопов для общего пользования. Если у вас есть свой инструмент, вы можете взять его, и наши эксперты помогут вам с настройкой и использованием.'
            )
        },
        {
            question: tPage('questions.kids.question', '❓Можно ли детям?'),
            answer: tPage(
                'questions.kids.answer',
                'Можно и нужно! Очень рады, когда подрастающее поколение интересуется наукой! Но есть рекомендованный возраст – от 6 лет. Поверьте нашему опыту.'
            )
        },
        {
            question: tPage('questions.photo.question', '❓Можно ли фотографировать?'),
            answer: tPage(
                'questions.photo.answer',
                'Конечно! Вы можете делать фотографии, но просьба соблюдать правила этикета, чтобы не мешать другим участникам. Не используйте яркие вспышки или фонари, так как это может испортить ночное наблюдение.'
            )
        },
        {
            question: tPage('questions.merch.question', '❓Как и где купить ваш мерч?'),
            answer: tPage(
                'questions.merch.answer',
                'На астрополяну везем худи, футболки, автонаклейки, открытки и стикерпаки. Хотите поддержать проект - купите наш мерч!'
            )
        },
        {
            question: tPage('questions.cancel.question', '❓Я зарегистрировался и не могу поехать. Что делать?'),
            answer: tPage(
                'questions.cancel.answer',
                'Просто отмените бронирование по прежней ссылке. На сайте появятся свободные слоты и люди смогут зарегистрироваться.'
            )
        },
        {
            question: tPage(
                'questions.more-people.question',
                '❓Я зарегистрировал 1\\2\\3\\4\\5 человек, а можно ли взять больше?'
            ),
            answer: tPage(
                'questions.more-people.answer',
                'Нет, нельзя. Наши правила едины для всех. По QR-коду на площадку проезжает то количество людей, которое вы зарегистрировали. Никак иначе.'
            )
        },
        {
            question: tPage(
                'questions.late-registration.question',
                '❓Регистрация закончилась и я не успел (а). Можно я приеду? Пожалуйста!'
            ),
            answer: tPage(
                'questions.late-registration.answer',
                'Нет, увы. Наши правила едины для всех. Мы не зря ввели систему регистраций и следим за въездом на астроплощадку.'
            )
        },
        {
            question: tPage('questions.support.question', '❓Вы мне нравитесь! Как вас поддержать?'),
            answer: (
                <>
                    {tPage('questions.support.answer', 'У нас есть')}{' '}
                    <a
                        href={'https://pay.cloudtips.ru/p/6818d70d'}
                        rel={'nofollow noopener'}
                        target={'_blank'}
                        title={tPage('questions.support.donates', 'донаты')}
                    >
                        {tPage('questions.support.donates', 'донаты')}
                    </a>
                    {tPage(
                        'questions.support.answer2',
                        '. Мы постоянно докупаем оборудование, обновляем технические возможности, создаем мерч и всякие активности. Ваша поддержка - это ❤︎❤︎❤︎'
                    )}
                </>
            )
        },
        {
            question: tPage('questions.feedback.question', '❓Где написать про вас отзыв?'),
            answer: tPage(
                'questions.feedback.answer',
                'Во всех социальных сетях наша группа называется "Смотри на звёзды". Мы ценим обратную связь и всегда читаем ваши отзывы. Спасибо вам за них!'
            )
        }
    ]

    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: typeof answer === 'string' ? answer : question
            }
        }))
    }

    return (
        <>
            <Head>
                <script
                    type={'application/ld+json'}
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
                />
            </Head>
            <AppLayout
                canonical={'stargazing/faq'}
                title={title}
                description={tPage(
                    'description',
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

                <div>
                    {tPage(
                        'description',
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
                </div>

                <div className={styles.faqList}>
                    {faqItems.map((item, idx) => {
                        const isOpen = openItems.has(idx)
                        const questionText = item.question.replace(/^❓\s*/u, '')

                        return (
                            <div
                                key={idx}
                                className={cn(styles.faqItem, isOpen && styles.open)}
                            >
                                <button
                                    className={styles.faqQuestion}
                                    onClick={() => toggleItem(idx)}
                                    aria-expanded={isOpen}
                                    aria-controls={`faq-answer-${idx}`}
                                >
                                    <span>{questionText}</span>
                                    <Icon
                                        name={'KeyboardDown'}
                                        className={styles.chevron}
                                    />
                                </button>

                                <div
                                    id={`faq-answer-${idx}`}
                                    className={styles.faqAnswer}
                                    role={'region'}
                                >
                                    <div>
                                        <div className={styles.faqAnswerContent}>{item.answer}</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <AppFooter />
            </AppLayout>
        </>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<object>> => {
            const locale = context.locale ?? 'ru'
            const translations = await serverSideTranslations(locale, ['translation', 'stargazing-faq'])

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                },
                revalidate: 86400
            }
        }
)

export default StargazingFAQPage
