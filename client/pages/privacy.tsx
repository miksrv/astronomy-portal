import React from 'react'
import { Container } from 'simple-react-ui-kit'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'
import { JsonLdScript } from 'next-seo'

import { setLocale, SITE_LINK, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'

const PrivacyPolicyPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const title = t('pages.privacy.title', 'Политика конфиденциальности')

    const description = t(
        'pages.privacy.description',
        'Политика обработки персональных данных проекта «Смотри на звезды»: какие данные мы собираем при авторизации, с какой целью, как храним и как отозвать согласие или отписаться от рассылки.'
    )

    const webPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${SITE_LINK}privacy`,
        name: title,
        url: `${SITE_LINK}privacy`,
        description,
        breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE_LINK },
                { '@type': 'ListItem', position: 2, name: title }
            ]
        }
    }

    return (
        <AppLayout
            canonical={'privacy'}
            title={title}
            description={description}
        >
            <JsonLdScript
                scriptKey={'privacy-webpage'}
                data={webPageSchema}
            />
            <AppToolbar
                title={title}
                currentPage={title}
            />

            <Container>
                <p style={{ marginTop: 0 }}>
                    {t(
                        'pages.privacy.intro',
                        'Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных пользователей сайта проекта «Смотри на звезды» (далее — «Сайт») и действует в отношении всей информации, которую Оператор может получить о пользователе во время использования Сайта. Политика подготовлена в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».'
                    )}
                </p>

                <h2>{t('pages.privacy.operator-title', '1. Оператор персональных данных')}</h2>
                <p>
                    {t(
                        'pages.privacy.operator-text',
                        'Оператором персональных данных является проект «Смотри на звезды». Контактный адрес для обращений по вопросам обработки персональных данных: astro@miksoft.pro.'
                    )}
                </p>

                <h2>{t('pages.privacy.data-title', '2. Какие данные мы собираем')}</h2>
                <p>
                    {t(
                        'pages.privacy.data-text',
                        'При авторизации на Сайте через сторонние сервисы (Google, Яндекс, VK) Оператор получает и сохраняет следующие данные из профиля пользователя: адрес электронной почты, имя (отображаемое имя) и, при наличии, фотографию профиля (аватар). Также автоматически могут собираться технические данные: cookie-файлы, IP-адрес, сведения о браузере и действиях на Сайте.'
                    )}
                </p>

                <h2>{t('pages.privacy.purpose-title', '3. Цели обработки персональных данных')}</h2>
                <p>
                    {t(
                        'pages.privacy.purpose-text',
                        'Персональные данные обрабатываются в следующих целях: авторизация и идентификация пользователя на Сайте; направление информационных писем о ближайших астровыездах и мероприятиях проекта; обеспечение работы и улучшение функциональности Сайта.'
                    )}
                </p>

                <h2>{t('pages.privacy.legal-title', '4. Правовое основание и согласие')}</h2>
                <p>
                    {t(
                        'pages.privacy.legal-text',
                        'Правовым основанием обработки является согласие пользователя, которое он даёт, проходя авторизацию на Сайте. Авторизуясь, пользователь подтверждает согласие на обработку своих персональных данных на условиях настоящей Политики, а также согласие на получение писем информационного характера о мероприятиях проекта.'
                    )}
                </p>

                <h2>{t('pages.privacy.transfer-title', '5. Передача данных третьим лицам')}</h2>
                <p>
                    {t(
                        'pages.privacy.transfer-text',
                        'Оператор не продаёт и не передаёт персональные данные третьим лицам, за исключением случаев, предусмотренных законодательством Российской Федерации. Авторизация осуществляется через сторонние сервисы (Google, Яндекс, VK), обработка данных которыми регулируется их собственными политиками конфиденциальности.'
                    )}
                </p>

                <h2>{t('pages.privacy.mailing-title', '6. Email-рассылка и отказ от неё')}</h2>
                <p>
                    {t(
                        'pages.privacy.mailing-text',
                        'После авторизации пользователь автоматически подписывается на рассылку писем о ближайших астровыездах. Пользователь может в любой момент отказаться от рассылки, перейдя по ссылке «Отписаться» в любом полученном письме или на странице отписки. Отказ от рассылки не влияет на возможность использования Сайта.'
                    )}
                </p>

                <h2>{t('pages.privacy.cookies-title', '7. Файлы cookie')}</h2>
                <p>
                    {t(
                        'pages.privacy.cookies-text',
                        'Сайт использует файлы cookie для сохранения сессии авторизации и корректной работы сервиса. Пользователь может отключить cookie в настройках браузера, однако это может ограничить функциональность Сайта.'
                    )}
                </p>

                <h2>{t('pages.privacy.storage-title', '8. Срок хранения и защита данных')}</h2>
                <p>
                    {t(
                        'pages.privacy.storage-text',
                        'Персональные данные хранятся до момента отзыва пользователем согласия на их обработку. Оператор принимает необходимые организационные и технические меры для защиты персональных данных от неправомерного доступа, изменения, раскрытия или уничтожения.'
                    )}
                </p>

                <h2>{t('pages.privacy.rights-title', '9. Права пользователя')}</h2>
                <p>
                    {t(
                        'pages.privacy.rights-text',
                        'Пользователь вправе получить информацию об обработке своих персональных данных, потребовать их уточнения, блокирования или удаления, а также отозвать согласие на обработку. Для этого необходимо направить обращение на контактный адрес Оператора, указанный в разделе 1.'
                    )}
                </p>

                <h2>{t('pages.privacy.changes-title', '10. Изменения Политики')}</h2>
                <p>
                    {t(
                        'pages.privacy.changes-text',
                        'Оператор вправе вносить изменения в настоящую Политику. Новая редакция Политики вступает в силу с момента её размещения на Сайте, если иное не предусмотрено новой редакцией.'
                    )}
                </p>

                <h2>{t('pages.privacy.contacts-title', '11. Контакты')}</h2>
                <p style={{ marginBottom: 0 }}>
                    {t(
                        'pages.privacy.contacts-text',
                        'По всем вопросам, связанным с обработкой персональных данных, вы можете связаться с Оператором по адресу: astro@miksoft.pro.'
                    )}
                    <Link
                        style={{ marginLeft: '5px' }}
                        href={'https://t.me/look_at_stars'}
                        title={t('common.telegram', 'Телеграм')}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('pages.privacy.telegram', 'Телеграм проекта')}
                    </Link>
                </p>
            </Container>

            <AppFooter />
        </AppLayout>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<object>> => {
            const locale = context.locale ?? 'ru'
            const translations = await serverSideTranslations(locale, ['translation'])

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                },
                revalidate: 86400
            }
        }
)

export default PrivacyPolicyPage
