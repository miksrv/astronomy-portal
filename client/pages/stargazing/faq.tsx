import React, { useState } from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { wrapper } from '@/api'
import { StaticInfoPageLayout } from '@/components/common'
import { initSSRLocale } from '@/utils/ssrLocale'

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
    const description = tPage(
        'description',
        'Узнайте ответы на частые вопросы об астровыездах: регистрация, что взять с собой, стоимость, длительность и как добраться. Готовьтесь к ночи под звёздами с комфортом!'
    )

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
            question: tPage('questions.next-event.question', 'Когда следующий астровыезд?'),
            answer: (
                <>
                    {tPage(
                        'questions.next-event.answer',
                        'Астровыезды мы проводим с мая по октябрь каждый год, но конкретные даты сильно зависят от погоды. Достаточно точный прогноз становится известен только за 2-4 дня до выезда, поэтому расписание на весь сезон заранее мы не публикуем. Чтобы не пропустить открытие регистрации на ближайший астровыезд – подпишитесь на наш'
                    )}{' '}
                    <a
                        href={'https://t.me/look_at_stars'}
                        rel={'nofollow noopener'}
                        target={'_blank'}
                        title={tPage('questions.next-event.telegram', 'Telegram-канал')}
                    >
                        {tPage('questions.next-event.telegram', 'Telegram-канал')}
                    </a>
                    {tPage(
                        'questions.next-event.answer2',
                        ', авторизуйтесь на сайте – после входа через почту или сервисы Яндекс или VK вы автоматически подключаетесь к рассылке о новых мероприятиях, а ещё периодически заглядывайте на страницу'
                    )}{' '}
                    <Link
                        href={'/stargazing'}
                        title={tPage('questions.next-event.stargazing', 'астровыездов')}
                    >
                        {tPage('questions.next-event.stargazing', 'астровыездов')}
                    </Link>
                    {tPage('questions.next-event.answer3', ', где мы публикуем анонсы.')}
                </>
            )
        },
        {
            question: tPage('questions.where.question', 'Как узнать, где проходит?'),
            answer: tPage(
                'questions.where.answer',
                'Наши астровыезды всегда проходят за городом. Обычно в пределах 40-70 км. Мы уезжаем от засветки и городских огней, чтобы увидеть звёзды. Точная локация доступна вам после регистрации. Если вдруг вы потеряли место локации - вернитесь на страницу регистрации снова по той же ссылке. Там есть геолокация - Яндекс.Карта и Google.Карта.'
            )
        },
        {
            question: tPage('questions.registration.question', 'Можно ли приехать без регистрации?'),
            answer: tPage(
                'questions.registration.answer',
                'Нет, нельзя. Регистрация обязательна, так как она позволяет нам планировать мероприятие, уведомлять участников о возможных изменениях и обеспечивать комфорт для всех.'
            )
        },
        {
            question: tPage('questions.qr.question', 'Зачем нужен QR-код?'),
            answer: tPage(
                'questions.qr.answer',
                'QR-код – это ваш входной билет на наше мероприятие. Его будут проверять на въезде. Просим приготовить заранее, чтобы не создавать пробок на месте. Если у вас нет QR-кода – мы вынуждены вам отказать. QR-код – это наш способ регулировать количество участников астровыезда на площадке. Наш природный ланшафт, да и физические возможности команды имеют границы. Просим уважать это и отнестись с пониманием.'
            )
        },
        {
            question: tPage('questions.what-to-bring.question', 'Что брать с собой?'),
            answer: tPage(
                'questions.what-to-bring.answer',
                'Для комфортного пребывания на астроплощадке обязательно иметь с собой теплую одежду (мы в степи, ночью там ветер и холодно), туристический коврик, походные стулья, пледы. Рекомендуем также - термосы с чаем/кофе и бутерброды. Советуем взять репеллент от насекомых. Кальяны, шашлыки, алкоголь, сигареты – под запретом! А еще у нас самая чистая площадка. После астровыезда не находим ни одного фантика и бумажки и очень благодарим вас за это!'
            )
        },
        {
            question: tPage('questions.no-car.question', 'У меня нет машины, что делать?'),
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
                'Можно ли добраться до места проведения астровыезда на общественном транспорте?'
            ),
            answer: tPage(
                'questions.public-transport.answer',
                'К сожалению, нет. Место проведения находится вдали от маршрутов общественного транспорта. Вы можете добраться туда на собственном автомобиле или присоединиться к другим участникам, если они готовы взять вас с собой. Мы рекомендуем договориться об этом заранее через наш Telegram-канал.'
            )
        },
        {
            question: tPage('questions.start-time.question', 'Во сколько начало?'),
            answer: tPage(
                'questions.start-time.answer',
                'Точное время начала указано в афише мероприятия и на странице регистрации – оно своё у каждого астровыезда. Как правило, мы начинаем, когда солнце садится за горизонт. Поэтому советуем приезжать на площадку заранее – за час-полтора до времени начала. Так вы успеете спокойно найти место на поляне, расположиться, сфотографироваться и встретить закат. И конечно, важно без спешки припарковать автомобиль, чтобы не создавать пробок на въезде. Мы очень это ценим!'
            )
        },
        {
            question: tPage('questions.price.question', 'Сколько стоит?'),
            answer: (
                <>
                    {tPage(
                        'questions.price.answer',
                        'Зависит от конкретного астровыезда – цену смотрите в карточке мероприятия при регистрации. Для платных выездов взрослый билет оплачивается онлайн, дети до 18 лет – всегда бесплатно. После оплаты вы получите QR-билет – это ваш пропуск на площадку. Если планы изменились – отмените бронирование, и деньги автоматически вернутся на карту в течение 1–10 рабочих дней. Часть выездов остается полностью бесплатной. Проект растет и развивается и мы всегда рады поддержке от слушателей и подписчиков. Для этого есть'
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
            question: tPage('questions.duration.question', 'Сколько длится астровыезд?'),
            answer: tPage(
                'questions.duration.answer',
                'В среднем официальная программа от начала лекции - до наблюдений в телескопы длится 2 часа. Но для вас они пролетят незаметно, гарантируем. А дальше вы сами выбираете – оставаться ли смотреть на небо с телескопами, или возвращаться домой. примерное время окончания: 00:30.'
            )
        },
        {
            question: tPage('questions.weather.question', 'Что делать, если будет облачно или дождь?'),
            answer: tPage(
                'questions.weather.answer',
                'Если прогноз погоды неблагоприятный (облака или осадки), мероприятие может быть отменено или перенесено. Мы всегда предупреждаем участников о таких изменениях через наш Telegram-канал, поэтому обязательно следите за обновлениями.'
            )
        },
        {
            question: tPage('questions.telescopes.question', 'Нужно ли приносить собственный телескоп?'),
            answer: tPage(
                'questions.telescopes.answer',
                'Нет, приносить телескоп не обязательно. У нас всегда есть несколько телескопов для общего пользования. Если у вас есть свой инструмент, вы можете взять его, и наши эксперты помогут вам с настройкой и использованием.'
            )
        },
        {
            question: tPage('questions.kids.question', 'Можно ли детям?'),
            answer: tPage(
                'questions.kids.answer',
                'Можно и нужно! Очень рады, когда подрастающее поколение интересуется наукой! Но есть рекомендованный возраст – от 6 лет. Поверьте нашему опыту.'
            )
        },
        {
            question: tPage('questions.photo.question', 'Можно ли фотографировать?'),
            answer: tPage(
                'questions.photo.answer',
                'Конечно! Вы можете делать фотографии, но просьба соблюдать правила этикета, чтобы не мешать другим участникам. Не используйте яркие вспышки или фонари, так как это может испортить ночное наблюдение.'
            )
        },
        {
            question: tPage('questions.merch.question', 'Как и где купить ваш мерч?'),
            answer: tPage(
                'questions.merch.answer',
                'На астрополяну везем худи, футболки, автонаклейки, открытки и стикерпаки. Хотите поддержать проект - купите наш мерч!'
            )
        },
        {
            question: tPage('questions.cancel.question', 'Я зарегистрировался и не могу поехать. Что делать?'),
            answer: tPage(
                'questions.cancel.answer',
                'Просто отмените бронирование по прежней ссылке. На сайте появятся свободные слоты и люди смогут зарегистрироваться.'
            )
        },
        {
            question: tPage(
                'questions.more-people.question',
                'Я зарегистрировал 1\\2\\3\\4\\5 человек, а можно ли взять больше?'
            ),
            answer: tPage(
                'questions.more-people.answer',
                'Нет, нельзя. Наши правила едины для всех. По QR-коду на площадку проезжает то количество людей, которое вы зарегистрировали. Никак иначе.'
            )
        },
        {
            question: tPage(
                'questions.late-registration.question',
                'Регистрация закончилась и я не успел (а). Можно я приеду? Пожалуйста!'
            ),
            answer: tPage(
                'questions.late-registration.answer',
                'К сожалению, нет. Наши правила едины для всех. Вместимость астрономической площадки ограничена, поэтому мы не зря ввели систему регистрации и следим за въездом на астроплощадку.'
            )
        },
        {
            question: tPage(
                'questions.no-more-tickets.question',
                'Я не успел зарегистрироваться, можете добавить ещё билетов?'
            ),
            answer: (
                <>
                    {tPage(
                        'questions.no-more-tickets.answer',
                        'К сожалению, нет. Мы ограничиваем количество участников не случайно: вместимость астрономической площадки и парковки ограничена, а охрана проверяет QR-коды на въезде. Приехать без регистрации и добавить дополнительные места мы не можем.'
                    )}{' '}
                    {tPage(
                        'questions.no-more-tickets.answer2',
                        'Лучшее решение – периодически проверять страницу регистрации: иногда участники отменяют бронь, и свободные места снова появляются. Также рекомендуем подписаться на наш'
                    )}{' '}
                    <a
                        href={'https://t.me/look_at_stars'}
                        rel={'nofollow noopener'}
                        target={'_blank'}
                        title={tPage('questions.no-more-tickets.telegram', 'Telegram-канал')}
                    >
                        {tPage('questions.no-more-tickets.telegram', 'Telegram-канал')}
                    </a>
                    {tPage(
                        'questions.no-more-tickets.answer3',
                        ' – мы всегда заранее сообщаем о новых астровыездах, и обычно регистрация открывается за несколько дней до мероприятия.'
                    )}
                </>
            )
        },
        {
            question: tPage('questions.support.question', 'Вы мне нравитесь! Как вас поддержать?'),
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
            question: tPage('questions.feedback.question', 'Где написать про вас отзыв?'),
            answer: (
                <>
                    {tPage(
                        'questions.feedback.answer',
                        'Отзыв можно оставить прямо на странице того мероприятия, которое вы посетили – откройте её и заполните форму с оценкой. Посмотреть, какие мероприятия вы посетили, можно в'
                    )}{' '}
                    <Link
                        href={'/profile'}
                        title={tPage('questions.feedback.profile', 'личном кабинете')}
                    >
                        {tPage('questions.feedback.profile', 'личном кабинете')}
                    </Link>
                    {tPage(
                        'questions.feedback.answer2',
                        ', в разделе «История мероприятий». Также вы можете написать отзыв в комментариях в нашем'
                    )}{' '}
                    <a
                        href={'https://t.me/look_at_stars'}
                        rel={'nofollow noopener'}
                        target={'_blank'}
                        title={tPage('questions.feedback.telegram', 'Telegram-канале')}
                    >
                        {tPage('questions.feedback.telegram', 'Telegram-канале')}
                    </a>
                    {tPage(
                        'questions.feedback.answer3',
                        '. Мы ценим обратную связь и всегда читаем ваши отзывы. Спасибо вам за них!'
                    )}
                </>
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
        <StaticInfoPageLayout
            canonical={'stargazing/faq'}
            title={title}
            description={description}
            openGraph={{
                images: [{ url: '/photos/stargazing-1.jpeg', width: 1280, height: 853 }]
            }}
            jsonLd={{ scriptKey: 'faq-schema', data: faqJsonLd }}
            breadcrumbLinks={[
                {
                    link: '/stargazing',
                    text: t('menu.stargazing', 'Астровыезды')
                }
            ]}
        >
            <div>
                {description}
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
                    const questionText = item.question.replace(/^\s*/u, '')

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
        </StaticInfoPageLayout>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<object>> => {
            const { translations } = await initSSRLocale(store, context, ['translation', 'stargazing-faq'])

            return {
                props: {
                    ...translations
                },
                revalidate: 86400
            }
        }
)

export default StargazingFAQPage
