import React from 'react'
import { Button, Container, Icon } from 'simple-react-ui-kit'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout } from '@/components/common'
import CalendarIcon from '@/components/icons/CalendarIcon'
import HeartIcon from '@/components/icons/HeartIcon'
import TicketIcon from '@/components/icons/TicketIcon'
import TShirtIcon from '@/components/icons/TShirtIcon'

import styles from './tickets.module.sass'

const StargazingTicketsPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const title = t('pages.stargazing-tickets.title', 'Билеты и поддержка проекта')

    return (
        <AppLayout
            canonical={'stargazing/tickets'}
            title={title}
            description={t(
                'pages.stargazing-tickets.description',
                'Купите билеты на астровыезды, сезонные абонементы и поддержите астрономический проект Miksoft Astro.'
            )}
        >
            <div
                className={styles.pageBackground}
                aria-hidden={'true'}
            />

            {/* Hero section */}
            <div className={styles.hero}>
                <h1 className={styles.heroTitle}>
                    <span style={{ display: 'block' }}>{t('pages.stargazing-tickets.hero-title-line1', 'БИЛЕТЫ')}</span>
                    <span style={{ display: 'block' }}>
                        {t('pages.stargazing-tickets.hero-title-line2', 'И ПОДДЕРЖКА ПРОЕКТА')}
                    </span>
                </h1>
                <p className={styles.heroSubtitle}>
                    {t(
                        'pages.stargazing-tickets.hero-subtitle',
                        'Присоединяйтесь к нашим выездам под звёздным небом! Выбирайте удобный формат участия и помогайте развивать астрономическое сообщество вместе с нами.'
                    )}
                </p>
            </div>

            {/* Options grid */}
            <div className={styles.optionsGrid}>
                {/* Option 1: Single ticket */}
                <div className={styles.optionCard}>
                    <div className={styles.optionHeader}>
                        <div className={styles.optionIconWrap}>
                            <TicketIcon className={styles.optionIcon} />
                        </div>
                        <p className={styles.optionTitle}>
                            {t('pages.stargazing-tickets.option1-title', 'Купить билет на одно мероприятие')}
                        </p>
                    </div>
                    <ul className={styles.optionFeatures}>
                        <li>{t('pages.stargazing-tickets.option1-feature1', 'Участие в одном выезде')}</li>
                        <li>{t('pages.stargazing-tickets.option1-feature2', 'Все активности программы')}</li>
                        <li>{t('pages.stargazing-tickets.option1-feature3', 'Общение и наблюдения')}</li>
                    </ul>
                    <Button
                        mode={'primary'}
                        stretched={true}
                        label={t('pages.stargazing-tickets.option1-button', 'Выбрать дату')}
                        link={'/stargazing'}
                    />
                </div>

                {/* Option 2: Season pass */}
                <div className={styles.optionCard}>
                    <div className={styles.optionHeader}>
                        <div className={styles.optionIconWrap}>
                            <CalendarIcon className={styles.optionIcon} />
                        </div>
                        <p className={styles.optionTitle}>
                            {t('pages.stargazing-tickets.option2-title', 'Купить абонемент на весь сезон 2026')}
                        </p>
                    </div>
                    <ul className={styles.optionFeatures}>
                        <li>{t('pages.stargazing-tickets.option2-feature1', '4 выезда в течение сезона')}</li>
                        <li>{t('pages.stargazing-tickets.option2-feature2', 'Приоритетная регистрация')}</li>
                        <li>{t('pages.stargazing-tickets.option2-feature3', 'Выгоднее, чем отдельные билеты')}</li>
                    </ul>
                    <Button
                        mode={'secondary'}
                        stretched={true}
                        label={t('pages.stargazing-tickets.option2-button', 'Подробнее')}
                        link={'/stargazing'}
                    />
                </div>

                {/* Option 3: Merch */}
                <div className={styles.optionCard}>
                    <div className={styles.optionHeader}>
                        <div className={styles.optionIconWrap}>
                            <TShirtIcon className={styles.optionIcon} />
                        </div>
                        <p className={styles.optionTitle}>
                            {t('pages.stargazing-tickets.option3-title', 'Купить мерч')}
                        </p>
                    </div>
                    <ul className={styles.optionFeatures}>
                        <li>{t('pages.stargazing-tickets.option3-feature1', 'Футболки, худи, аксессуары')}</li>
                        <li>{t('pages.stargazing-tickets.option3-feature2', 'Доставка по всей России')}</li>
                        <li>{t('pages.stargazing-tickets.option3-feature3', 'Поддержка проекта')}</li>
                    </ul>
                    <Button
                        mode={'secondary'}
                        icon={'External'}
                        stretched={true}
                        label={t('pages.stargazing-tickets.option3-button', 'Перейти в магазин')}
                        link={'https://t.me/look_at_stars'}
                    />
                </div>

                {/* Option 4: Support project */}
                <div className={styles.optionCard}>
                    <div className={styles.optionHeader}>
                        <div className={styles.optionIconWrap}>
                            <HeartIcon className={styles.optionIcon} />
                        </div>
                        <p className={styles.optionTitle}>
                            {t('pages.stargazing-tickets.option4-title', 'Поддержать проект')}
                        </p>
                    </div>
                    <ul className={styles.optionFeatures}>
                        <li>{t('pages.stargazing-tickets.option4-feature1', 'Ваш вклад в развитие астрономии')}</li>
                        <li>{t('pages.stargazing-tickets.option4-feature2', 'Новое оборудование и локации')}</li>
                        <li>{t('pages.stargazing-tickets.option4-feature3', 'Больше мероприятий для всех')}</li>
                    </ul>
                    <Button
                        mode={'secondary'}
                        stretched={true}
                        label={t('pages.stargazing-tickets.option4-button', 'Поддержать')}
                        link={'/about#your-help'}
                    />
                </div>
            </div>

            {/* Steps section */}
            <Container>
                <div className={styles.stepsSection}>
                    <h2 className={styles.stepsTitle}>
                        {t('pages.stargazing-tickets.steps-title', 'Как купить билет')}
                    </h2>
                    <div className={styles.stepsGrid}>
                        {/* Connecting line between step circles */}
                        <div className={styles.stepConnector} />

                        <div className={styles.stepItem}>
                            <div className={styles.stepNumber}>{'1'}</div>
                            <svg
                                className={styles.stepIcon}
                                viewBox={'0 0 24 24'}
                                fill={'none'}
                                strokeWidth={'1.5'}
                                strokeLinecap={'round'}
                                strokeLinejoin={'round'}
                            >
                                <rect
                                    x={'5'}
                                    y={'3'}
                                    width={'14'}
                                    height={'18'}
                                    rx={'2'}
                                />
                                <path d={'M9 7h6M9 11h6M9 15h4'} />
                            </svg>
                            <p className={styles.stepTitle}>
                                {t('pages.stargazing-tickets.step1-title', 'Выберите формат')}
                            </p>
                            <p className={styles.stepText}>
                                {t(
                                    'pages.stargazing-tickets.step1-text',
                                    'Выберите подходящий вам вариант: билет на одно мероприятие или абонемент на сезон.'
                                )}
                            </p>
                        </div>

                        <div className={styles.stepItem}>
                            <div className={styles.stepNumber}>{'2'}</div>
                            <svg
                                className={styles.stepIcon}
                                viewBox={'0 0 24 24'}
                                fill={'none'}
                                strokeWidth={'1.5'}
                                strokeLinecap={'round'}
                                strokeLinejoin={'round'}
                            >
                                <rect
                                    x={'3'}
                                    y={'4'}
                                    width={'18'}
                                    height={'18'}
                                    rx={'2'}
                                />
                                <path d={'M16 2v4M8 2v4M3 10h18'} />
                                <circle
                                    cx={'12'}
                                    cy={'16'}
                                    r={'1.5'}
                                    fill={'currentColor'}
                                    stroke={'none'}
                                />
                            </svg>
                            <p className={styles.stepTitle}>
                                {t('pages.stargazing-tickets.step2-title', 'Выберите дату')}
                            </p>
                            <p className={styles.stepText}>
                                {t(
                                    'pages.stargazing-tickets.step2-text',
                                    'Для билета на одно мероприятие выберите удобную дату из расписания.'
                                )}
                            </p>
                        </div>

                        <div className={styles.stepItem}>
                            <div className={styles.stepNumber}>{'3'}</div>
                            <svg
                                className={styles.stepIcon}
                                viewBox={'0 0 24 24'}
                                fill={'none'}
                                strokeWidth={'1.5'}
                                strokeLinecap={'round'}
                                strokeLinejoin={'round'}
                            >
                                <path d={'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2'} />
                                <circle
                                    cx={'12'}
                                    cy={'7'}
                                    r={'4'}
                                />
                            </svg>
                            <p className={styles.stepTitle}>
                                {t('pages.stargazing-tickets.step3-title', 'Заполните данные')}
                            </p>
                            <p className={styles.stepText}>
                                {t(
                                    'pages.stargazing-tickets.step3-text',
                                    'Укажите ваши данные для оформления билета и связи по мероприятию.'
                                )}
                            </p>
                        </div>

                        <div className={styles.stepItem}>
                            <div className={styles.stepNumber}>{'4'}</div>
                            <svg
                                className={styles.stepIcon}
                                viewBox={'0 0 24 24'}
                                fill={'none'}
                                strokeWidth={'1.5'}
                                strokeLinecap={'round'}
                                strokeLinejoin={'round'}
                            >
                                <rect
                                    x={'1'}
                                    y={'4'}
                                    width={'22'}
                                    height={'16'}
                                    rx={'2'}
                                />
                                <path d={'M1 10h22M7 15h.01M11 15h4'} />
                            </svg>
                            <p className={styles.stepTitle}>
                                {t('pages.stargazing-tickets.step4-title', 'Оплатите заказ')}
                            </p>
                            <p className={styles.stepText}>
                                {t(
                                    'pages.stargazing-tickets.step4-text',
                                    'Выберите способ оплаты и завершите покупку на защищённой странице.'
                                )}
                            </p>
                        </div>

                        <div className={styles.stepItem}>
                            <div className={styles.stepNumber}>{'5'}</div>
                            <svg
                                className={styles.stepIcon}
                                viewBox={'0 0 24 24'}
                                fill={'none'}
                                strokeWidth={'1.5'}
                                strokeLinecap={'round'}
                                strokeLinejoin={'round'}
                            >
                                <path
                                    d={'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'}
                                />
                                <polyline points={'22,6 12,13 2,6'} />
                            </svg>
                            <p className={styles.stepTitle}>
                                {t('pages.stargazing-tickets.step5-title', 'Получите подтверждение')}
                            </p>
                            <p className={styles.stepText}>
                                {t(
                                    'pages.stargazing-tickets.step5-text',
                                    'Билет придёт на вашу почту. Проверьте папку «Входящие» и «Спам».'
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </Container>

            {/* Important notes */}
            <Container>
                <div className={styles.importantInner}>
                    <div className={styles.importantContent}>
                        <div className={styles.importantHeader}>
                            <Icon name={'ReportError'} />
                            {t('pages.stargazing-tickets.important-title', 'Важно знать')}
                        </div>
                        <ul className={styles.importantList}>
                            <li>
                                {t(
                                    'pages.stargazing-tickets.important1',
                                    'Количество мест на выездах ограничено — рекомендуем покупать билеты заранее.'
                                )}
                            </li>
                            <li>
                                {t(
                                    'pages.stargazing-tickets.important2',
                                    'Билет именной и не подлежит передаче третьим лицам.'
                                )}
                            </li>
                            <li>
                                {t(
                                    'pages.stargazing-tickets.important3',
                                    'Возврат возможен не позднее чем за 48 часов до мероприятия.'
                                )}
                            </li>
                            <li>
                                {t(
                                    'pages.stargazing-tickets.important4',
                                    'В случае плохой погоды выезд может быть перенесён — следите за уведомлениями.'
                                )}
                            </li>
                        </ul>
                    </div>
                    <img
                        className={styles.telescopeImage}
                        src={'/images/telescope-illustration.png'}
                        alt={''}
                        aria-hidden={'true'}
                    />
                </div>
            </Container>

            {/* Contacts section */}
            <Container>
                <div className={styles.contactsSection}>
                    {/* Col 1: CTA */}
                    <div>
                        <h2 className={styles.stepsTitle}>
                            {t('pages.stargazing-tickets.contacts-title', 'Остались вопросы?')}
                        </h2>
                        <p className={styles.contactsDesc}>
                            {t('pages.stargazing-tickets.contacts-desc', 'Мы всегда на связи и готовы помочь!')}
                        </p>
                        <Button
                            mode={'secondary'}
                            label={t('pages.stargazing-tickets.contacts-faq-button', 'Перейти в FAQ')}
                            link={'/stargazing/faq'}
                        />
                    </div>

                    {/* Col 2: Telegram */}
                    <div className={styles.contactsItem}>
                        <Icon
                            name={'Telegram'}
                            className={styles.contactsItemIcon}
                        />
                        <div className={styles.contactsItemText}>
                            <p className={styles.contactsItemTitle}>
                                {t('pages.stargazing-tickets.contacts-telegram-label', 'Написать нам в Telegram')}
                            </p>
                            <Link
                                className={styles.contactsLink}
                                href={'https://t.me/look_at_stars'}
                                target={'_blank'}
                                rel={'noindex nofollow'}
                            >
                                {'@look_at_stars'}
                            </Link>
                        </div>
                    </div>

                    {/* Col 3: Social */}
                    <div className={styles.contactsItem}>
                        <Icon
                            name={'Bell'}
                            className={styles.contactsItemIcon}
                        />
                        <div className={styles.contactsItemText}>
                            <p className={styles.contactsItemTitle}>
                                {t('pages.stargazing-tickets.contacts-social-label', 'Следите за новостями')}
                            </p>
                            <p className={styles.contactsSocials}>
                                <Link
                                    className={styles.contactsLink}
                                    href={'https://t.me/look_at_stars'}
                                    target={'_blank'}
                                    rel={'noindex nofollow'}
                                >
                                    {'VK'}
                                </Link>
                                {' · '}
                                <Link
                                    className={styles.contactsLink}
                                    href={'https://t.me/look_at_stars'}
                                    target={'_blank'}
                                    rel={'noindex nofollow'}
                                >
                                    {'Telegram'}
                                </Link>
                                {' · '}
                                <Link
                                    className={styles.contactsLink}
                                    href={'https://t.me/look_at_stars'}
                                    target={'_blank'}
                                    rel={'noindex nofollow'}
                                >
                                    {'Instagram'}
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </Container>

            <AppFooter />
        </AppLayout>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<object>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                },
                revalidate: 86400
            }
        }
)

export default StargazingTicketsPage
