import React, { useMemo, useState } from 'react'

import { GetServerSidePropsResult, NextPage } from 'next'
import Head from 'next/head'
import { useTranslation } from 'next-i18next/pages'

import { API, SITE_LINK, wrapper } from '@/api'
import { AppLayout, BreadcrumbJsonLd, StarMap } from '@/components/common'
import { getMountTelescope, StarMapTelescope } from '@/components/common/star-map/telescope'
import { StarMapIntro } from '@/components/pages/starmap'
import { formatDECShort, formatRAShort } from '@/utils/coordinates'
import { createPageUrl, toJsonLd } from '@/utils/helpers'
import { initSSRLocale } from '@/utils/ssrLocale'

import styles from './starmap.module.sass'

/** The agent posts a snapshot every minute or so: ask at that pace */
const OBSERVATORY_POLLING_MS = 60_000

const CelestialPage: NextPage<object> = () => {
    const { t, i18n } = useTranslation()

    const { data } = API.useObjectsGetListQuery()

    // Where the observatory's telescope points: a marker on the map while it is online and unparked
    const { data: observatory } = API.useObservatoryGetStatusQuery(undefined, {
        pollingInterval: OBSERVATORY_POLLING_MS,
        skipPollingIfUnfocused: true
    })
    const online = !!observatory?.online
    const mount = observatory?.snapshot?.mount
    const fov = observatory?.snapshot?.camera?.fov
    const telescopeLabel = t('pages.star-map.telescope', 'Телескоп обсерватории')

    const telescope = useMemo((): StarMapTelescope | null => {
        const pointing = online ? getMountTelescope(mount, fov) : null

        return pointing
            ? {
                  ...pointing,
                  label: telescopeLabel,
                  detail: `${formatRAShort(pointing.ra)} ${formatDECShort(pointing.dec)}`
              }
            : null
        // The marker follows the numbers, not the object each poll hands over
    }, [
        online,
        mount?.parked,
        mount?.raJ2000,
        mount?.decJ2000,
        mount?.target?.ra,
        mount?.target?.dec,
        fov?.width,
        fov?.height,
        telescopeLabel
    ])

    // Mirrors the map's hide-UI (screenshot) mode so the floating intro card, which lives
    // outside the map element, hides together with the map's own overlays
    const [uiHidden, setUiHidden] = useState(false)

    const title = t('pages.star-map.title', 'Карта звёздного неба онлайн')
    // The <title> carries the long-tail of the search demand ("бесплатно", "сегодня", "по дате");
    // the H1 stays the short head term
    const seoTitle = t(
        'pages.star-map.seo-title',
        'Карта звёздного неба онлайн бесплатно — небо сегодня и на любую дату'
    )
    const description = t(
        'pages.star-map.description',
        'Интерактивная карта звёздного неба онлайн бесплатно: небо сейчас или на любую дату и время в вашем городе. Звёзды, созвездия, планеты, Луна, туманности и галактики.'
    )

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
        screenshot: `${SITE_LINK}images/starmap.jpg`,
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'RUB' },
        featureList: t(
            'pages.star-map.feature-list',
            'Небо в реальном времени, небо на любую дату и время, выбор места наблюдения, созвездия и их границы, планеты, Луна и Солнце, галактики и туманности, Млечный Путь, поиск объектов'
        ),
        inLanguage: i18n.language === 'en' ? 'en' : 'ru',
        publisher: { '@type': 'Organization', name: t('common.look-at-the-stars', 'Смотри на звёзды'), url: SITE_LINK }
    }

    return (
        <AppLayout
            fullWidth={true}
            canonical={'starmap'}
            noBrandSuffix={true}
            title={seoTitle}
            description={description}
            openGraph={{
                images: [{ url: '/images/starmap.jpg', width: 1200, height: 630, alt: title }]
            }}
        >
            <BreadcrumbJsonLd currentPage={title} />
            <Head>
                <script
                    type={'application/ld+json'}
                    dangerouslySetInnerHTML={{ __html: toJsonLd(webApplicationJsonLd) }}
                />
            </Head>
            {/* One flex column sized to the viewport (see starmap.module.sass). The intro is
                rendered BEFORE the map so crawlers meet the H1 + copy first; it floats over
                the map's top-right corner, and is hidden on mobile where the map takes the
                whole screen. */}
            <div className={styles.page}>
                <StarMapIntro
                    title={title}
                    hidden={uiHidden}
                />
                <div className={styles.mapArea}>
                    {/* data.items is referentially stable between refetches (RTK Query), so no memo is needed */}
                    <StarMap
                        objects={data?.items}
                        telescope={telescope}
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
            // Static shell: everything on the page is drawn on the client
            context.res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')

            const { translations } = await initSSRLocale(store, context, ['translation', 'starmap'])

            // The page's own `useObjectsGetListQuery()` picks this up from __NEXT_DATA__
            // (extractRehydrationInfo) instead of fetching after hydration
            await store.dispatch(API.endpoints?.objectsGetList.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default CelestialPage
