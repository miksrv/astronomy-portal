import React from 'react'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'

import { SITE_LINK, wrapper } from '@/api'
import { ContentText, StaticInfoPageLayout } from '@/components/common'
import type { ContentPageData } from '@/utils/content'
import { loadContentPage } from '@/utils/content.server'
import { initSSRLocale } from '@/utils/ssrLocale'

type StargazingWherePageProps = Pick<ContentPageData, 'title' | 'description' | 'html'>

/** The text of the page is `client/content/stargazing-where.<locale>.md` */
const StargazingWherePage: NextPage<StargazingWherePageProps> = ({ title, description, html }) => {
    const { t } = useTranslation()

    const touristAttractionSchema = {
        '@context': 'https://schema.org',
        '@type': 'TouristAttraction',
        name: title,
        description,
        url: `${SITE_LINK}stargazing/where`,
        address: {
            '@type': 'PostalAddress',
            addressLocality: 'Оренбург',
            addressCountry: 'RU'
        },
        isAccessibleForFree: true,
        organizer: {
            '@type': 'Organization',
            name: 'Смотри на звёзды',
            url: SITE_LINK
        }
    }

    return (
        <StaticInfoPageLayout
            canonical={'stargazing/where'}
            title={title}
            description={description}
            openGraph={{
                images: [
                    {
                        height: 960,
                        url: '/photos/sidewalk-asrtronomy-1.jpeg',
                        width: 1280
                    }
                ]
            }}
            jsonLd={{ scriptKey: 'where-tourist-attraction', data: touristAttractionSchema }}
            breadcrumbLinks={[
                {
                    link: '/stargazing',
                    text: t('menu.stargazing', 'Астровыезды')
                }
            ]}
        >
            <ContentText html={html} />
        </StaticInfoPageLayout>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<StargazingWherePageProps>> => {
            const { locale, translations } = await initSSRLocale(store, context)
            const { title, description, html } = loadContentPage('stargazing-where', locale)

            return {
                props: {
                    ...translations,
                    title,
                    description,
                    html
                }
            }
        }
)

export default StargazingWherePage
