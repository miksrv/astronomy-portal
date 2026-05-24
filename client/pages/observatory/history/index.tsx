import React from 'react'
import { Container } from 'simple-react-ui-kit'

import fs from 'fs'
import path from 'path'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { HistoryChapterMeta } from '@/data/history'
import { formatYearMonth } from '@/utils/dates'

import styles from './styles.module.sass'

interface ObservatoryHistoryPageProps {
    chapters: HistoryChapterMeta[]
}

const ObservatoryHistoryPage: NextPage<ObservatoryHistoryPageProps> = ({ chapters }) => {
    const { t } = useTranslation()
    const { locale } = useRouter()

    const localize = (ru: string, en?: string) => (locale === 'en' && en ? en : ru)

    const title = t('pages.observatory-history.title', 'История обсерватории')

    return (
        <AppLayout
            canonical={'observatory/history'}
            title={title}
            description={t(
                'pages.observatory-history.description',
                'История строительства и развития любительской астрономической обсерватории: от первого колышка до удалённого управления телескопом.'
            )}
            openGraph={{
                images: [{ url: '/photos/observatory-3.jpeg', width: 1280, height: 851 }]
            }}
        >
            <AppToolbar
                title={title}
                currentPage={title}
                links={[{ link: '/observatory', text: t('menu.observatory', 'Обсерватория') }]}
            />

            <div className={styles.grid}>
                {chapters.map((chapter) => (
                    <Link
                        key={chapter.slug}
                        href={`/observatory/history/${chapter.slug}`}
                        title={localize(chapter.title, chapter.title_en)}
                        className={styles.card}
                    >
                        <Container>
                            <div className={styles.coverWrapper}>
                                <Image
                                    className={styles.cover}
                                    src={chapter.coverPhoto}
                                    alt={localize(chapter.title, chapter.title_en)}
                                    fill
                                    sizes={'(max-width: 640px) 100vw, 50vw'}
                                />
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.cardDate}>{formatYearMonth(chapter.date, locale ?? 'ru')}</div>
                                <h2 className={styles.cardTitle}>{localize(chapter.title, chapter.title_en)}</h2>
                                <p className={styles.cardSummary}>{localize(chapter.summary, chapter.summary_en)}</p>
                            </div>
                        </Container>
                    </Link>
                ))}
            </div>

            <AppFooter />
        </AppLayout>
    )
}

const MANIFEST_PATH = path.join(process.cwd(), 'content/history/manifest.json')

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<ObservatoryHistoryPageProps>> => {
            const locale = context.locale ?? 'ru'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            const HOST_IMG = process.env.NEXT_PUBLIC_IMG_HOST || 'http://localhost:8080/'
            const raw: HistoryChapterMeta[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
            const chapters = raw.map((c) => ({ ...c, coverPhoto: `${HOST_IMG}${c.coverPhoto}` }))

            return {
                props: { ...translations, chapters }
            }
        }
)

export default ObservatoryHistoryPage
