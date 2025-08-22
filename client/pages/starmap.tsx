import React from 'react'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar, StarMap } from '@/components/common'

// TODO: При добавить URL параметр названия объекта для центрирования карты на нем
const CelestialPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const { data } = API.useObjectsGetListQuery()

    const title = t('pages.star-map.title', { defaultValue: 'Карта звёздного неба' })

    return (
        <AppLayout
            canonical={'starmap'}
            title={title}
            description={t('pages.star-map.description', {
                defaultValue:
                    'Карта звездного неба с галактиками, туманностями, кометами, сверхновыми и другими космическими объектами, снятых любительским телескопом'
            })}
            openGraph={{
                images: [
                    {
                        height: 815,
                        url: '/screenshots/starmap.jpg',
                        width: 1280
                    }
                ]
            }}
        >
            <AppToolbar
                title={title}
                currentPage={title}
            />

            <p>
                {t('pages.star-map.text-part-1', {
                    defaultValue:
                        'Звездная карта - это интерактивное окно во Вселенную, где собраны снимки галактик, туманностей, комет, сверхновых и других астрономических объектов. Эти изображения получены с помощью любительского телескопа, что делает их особенно ценными: они демонстрируют, какие красоты космоса доступны даже вне профессиональных обсерваторий.'
                })}
            </p>
            <p>
                {t('pages.star-map.text-part-2', {
                    defaultValue:
                        'Карта позволяет изучать ночное небо в деталях, прослеживать движение небесных тел и находить интересные объекты для наблюдений. Благодаря качественной астросъёмке и систематическому пополнению каталога, каждый посетитель может увидеть космос таким, каким его видят энтузиасты астрономии по всему миру.'
                })}
            </p>

            <Container style={{ padding: '5px' }}>
                <StarMap objects={data?.items} />
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

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default CelestialPage
