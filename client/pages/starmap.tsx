import React, { useMemo, useState } from 'react'

import { GetServerSidePropsResult, NextPage } from 'next'
import Head from 'next/head'
import { useTranslation } from 'next-i18next/pages'

import { API, wrapper } from '@/api'
import { AppLayout, BreadcrumbJsonLd, StarMap } from '@/components/common'
import { StarMapIntro } from '@/components/pages/starmap'
import { createPageUrl } from '@/utils/helpers'
import { initSSRLocale } from '@/utils/ssrLocale'

import styles from './starmap.module.sass'

const CelestialPage: NextPage<object> = () => {
    const { t, i18n } = useTranslation()

    const { data } = API.useObjectsGetListQuery()

    // Mirrors the map's hide-UI (screenshot) mode so the floating intro card, which lives
    // outside the map element, hides together with the map's own overlays
    const [uiHidden, setUiHidden] = useState(false)

    const title = t('pages.star-map.title', 'Карта звёздного неба онлайн')
    const description = t(
        'pages.star-map.description',
        'Бесплатная интерактивная карта звёздного неба онлайн: звёзды, созвездия, планеты, туманности и галактики. Настраивайте слои карты и исследуйте небо в реальном времени.'
    )

    // Memoize objects array to avoid triggering StarMapRender rebuild on unrelated re-renders
    const starMapObjects = useMemo(() => data?.items, [data?.items])

    const pageUrl = createPageUrl(i18n.language, 'starmap')

    const webApplicationJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: title,
        description,
        url: pageUrl,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true,
        inLanguage: i18n.language === 'en' ? 'en' : 'ru'
    }

    return (
        <AppLayout
            fullWidth={true}
            canonical={'starmap'}
            title={title}
            description={description}
            // og:image intentionally omitted: /screenshots/starmap.jpg never existed in the
            // repo (broken social previews). A real screenshot of the upgraded map is a
            // content/asset task once FEAT-27's planetarium mode ships (features/star-atlas-upgrade.md, FE-7).
        >
            <BreadcrumbJsonLd currentPage={title} />
            <Head>
                <script
                    type={'application/ld+json'}
                    // '<' is escaped so translated strings can never close the script tag
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationJsonLd).replace(/</g, '\\u003c') }}
                />
            </Head>
            {/* One flex column sized to the viewport (see starmap.module.sass). The intro is
                rendered BEFORE the map so crawlers meet the H1 + copy first; on desktop it
                floats over the map's top-right corner, on mobile it is laid out under it. */}
            <div className={styles.page}>
                <StarMapIntro
                    title={title}
                    hidden={uiHidden}
                />
                <div className={styles.mapArea}>
                    <StarMap
                        objects={starMapObjects}
                        interactive={true}
                        showSettings={true}
                        fitContainer={true}
                        onUiHiddenChange={setUiHidden}
                    />
                </div>
            </div>
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const { translations } = await initSSRLocale(store, context)

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default CelestialPage
