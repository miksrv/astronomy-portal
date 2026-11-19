import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { LandingSection, NumberedList } from '@/components/ui'

interface StargazingGuideProps {
    /** The page the list is shown on: left out of it */
    current?: string
}

/**
 * The four pages a participant reads before a trip, as numbered links: on /stargazing all four,
 * at the end of each of them the other three
 */
export const StargazingGuide: React.FC<StargazingGuideProps> = ({ current }) => {
    const { t } = useTranslation()

    const items = [
        {
            href: '/stargazing/howto',
            title: t('pages.stargazing.guide-howto-title', 'Как проходит'),
            text: t(
                'pages.stargazing.guide-howto-text',
                'Весь вечер по шагам: регистрация, дорога до поляны, лекция, экскурсия по созвездиям и телескопы.'
            )
        },
        {
            href: '/stargazing/where',
            title: t('pages.stargazing.guide-where-title', 'Где посмотреть'),
            text: t(
                'pages.stargazing.guide-where-text',
                'Тротуарная астрономия на улицах Оренбурга и выезды за город, где без засветки видны туманности и галактики.'
            )
        },
        {
            href: '/stargazing/rules',
            title: t('pages.stargazing.guide-rules-title', 'Правила'),
            text: t(
                'pages.stargazing.guide-rules-text',
                'Чего не делать на поляне: яркий свет, костры, алкоголь и шум мешают наблюдениям и соседям.'
            )
        },
        {
            href: '/stargazing/faq',
            title: t('pages.stargazing.guide-faq-title', 'Вопросы и ответы'),
            text: t(
                'pages.stargazing.guide-faq-text',
                'Сколько стоит, что взять с собой, можно ли с детьми и что делать, если пойдёт дождь: ответы на частые вопросы.'
            )
        }
    ].filter((item) => item.href !== current)

    return (
        <NumberedList
            items={items}
            inlineTitle
        />
    )
}

interface StargazingGuideMoreProps {
    /** The guide page it closes: left out of the list */
    current: string
}

/** The end of a guide page (how-to, where, rules, FAQ): the other three under one heading */
export const StargazingGuideMore: React.FC<StargazingGuideMoreProps> = ({ current }) => {
    const { t } = useTranslation()

    return (
        <LandingSection
            kicker={t('pages.stargazing.guide-more-kicker', 'Астровыезды')}
            title={t('pages.stargazing.guide-more-title', 'Что ещё')}
            accent={t('pages.stargazing.guide-more-accent', 'почитать перед поездкой')}
        >
            <StargazingGuide current={current} />
        </LandingSection>
    )
}
