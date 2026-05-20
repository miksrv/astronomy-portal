import React, { useMemo, useState } from 'react'
import { Container } from 'simple-react-ui-kit'

import fs from 'fs'
import path from 'path'

import { GetStaticPathsResult, GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar, PhotoGallery, PhotoLightbox, PrevNextNav } from '@/components/common'
import { GalleryBlock, HistoryChapter, HistoryChapterMeta } from '@/data/history'
import { formatYearMonth } from '@/utils/dates'

import styles from './styles.module.sass'

interface HistoryChapterPageProps {
    chapter: HistoryChapter
    prevChapter: HistoryChapterMeta | null
    nextChapter: HistoryChapterMeta | null
}

const HistoryChapterPage: NextPage<HistoryChapterPageProps> = ({ chapter, prevChapter, nextChapter }) => {
    const { t } = useTranslation()
    const { locale } = useRouter()

    const [showLightbox, setShowLightbox] = useState(false)
    const [photoIndex, setPhotoIndex] = useState(0)

    const localize = (ru: string, en?: string) => (locale === 'en' && en ? en : ru)

    const title = localize(chapter.title, chapter.title_en)

    const allGalleryPhotos = useMemo(
        () =>
            chapter.sections.flatMap((section) =>
                section.blocks
                    .filter((b): b is GalleryBlock => b.type === 'gallery')
                    .flatMap((b) =>
                        b.photos.map((p) => ({
                            src: p.url,
                            width: p.width,
                            height: p.height,
                            title: localize(p.caption ?? '', p.caption_en)
                        }))
                    )
            ),
        [chapter, locale]
    )

    const galleryOffsets = useMemo(() => {
        let offset = 0
        return chapter.sections.map((section) =>
            section.blocks.map((block) => {
                const current = offset
                if (block.type === 'gallery') {
                    offset += block.photos.length
                }
                return current
            })
        )
    }, [chapter])

    const handlePhotoClick = (sectionIndex: number, blockIndex: number, photoIdx: number) => {
        setPhotoIndex(galleryOffsets[sectionIndex][blockIndex] + photoIdx)
        setShowLightbox(true)
    }

    return (
        <AppLayout
            canonical={`observatory/history/${chapter.slug}`}
            title={title}
            description={localize(chapter.summary, chapter.summary_en)}
            openGraph={{
                images: [{ url: chapter.coverPhoto, width: 1200, height: 630 }]
            }}
        >
            <div
                className={styles.pageBackground}
                aria-hidden={'true'}
            />

            <AppToolbar
                title={title}
                currentPage={title}
                links={[
                    { link: '/observatory', text: t('menu.observatory', 'Обсерватория') },
                    {
                        link: '/observatory/history',
                        text: t('pages.observatory-history.title', 'История обсерватории')
                    }
                ]}
            />

            <div className={styles.chapterDate}>{formatYearMonth(chapter.date, locale ?? 'ru')}</div>

            {chapter.sections.map((section, sectionIndex) => (
                <React.Fragment key={sectionIndex}>
                    {section.heading && (
                        <h2 className={styles.sectionHeading}>{localize(section.heading, section.heading_en)}</h2>
                    )}
                    <Container className={styles.section}>
                        {section.blocks.map((block, blockIndex) => {
                            switch (block.type) {
                                case 'text':
                                    return (
                                        <p
                                            key={blockIndex}
                                            className={styles.blockText}
                                        >
                                            {localize(block.content, block.content_en)}
                                        </p>
                                    )

                                case 'gallery':
                                    return (
                                        <div
                                            key={blockIndex}
                                            className={styles.blockGallery}
                                        >
                                            <PhotoGallery
                                                photos={block.photos.map((photo) => ({
                                                    src: photo.url,
                                                    width: photo.width,
                                                    height: photo.height,
                                                    alt: localize(photo.caption ?? '', photo.caption_en)
                                                }))}
                                                onClick={({ index }) =>
                                                    handlePhotoClick(sectionIndex, blockIndex, index)
                                                }
                                            />
                                        </div>
                                    )
                            }
                        })}
                    </Container>
                </React.Fragment>
            ))}

            <PrevNextNav
                prev={
                    prevChapter
                        ? {
                              href: `/observatory/history/${prevChapter.slug}`,
                              title: localize(prevChapter.title, prevChapter.title_en),
                              subtitle: formatYearMonth(prevChapter.date, locale ?? 'ru')
                          }
                        : null
                }
                next={
                    nextChapter
                        ? {
                              href: `/observatory/history/${nextChapter.slug}`,
                              title: localize(nextChapter.title, nextChapter.title_en),
                              subtitle: formatYearMonth(nextChapter.date, locale ?? 'ru')
                          }
                        : null
                }
            />

            <PhotoLightbox
                photos={allGalleryPhotos}
                photoIndex={photoIndex}
                showLightbox={showLightbox}
                onCloseLightBox={() => setShowLightbox(false)}
                onChangeIndex={setPhotoIndex}
            />

            <AppFooter />
        </AppLayout>
    )
}

const MANIFEST_PATH = path.join(process.cwd(), 'content/history/manifest.json')
const CONTENT_DIR = path.join(process.cwd(), 'content/history')

const applyHost = (hostImg: string, raw: HistoryChapter): HistoryChapter => ({
    ...raw,
    coverPhoto: `${hostImg}${raw.coverPhoto}`,
    sections: raw.sections.map((section) => ({
        ...section,
        blocks: section.blocks.map((block) =>
            block.type === 'gallery'
                ? { ...block, photos: block.photos.map((p) => ({ ...p, url: `${hostImg}${p.url}` })) }
                : block
        )
    }))
})

const applyHostMeta = (hostImg: string, meta: HistoryChapterMeta): HistoryChapterMeta => ({
    ...meta,
    coverPhoto: `${hostImg}${meta.coverPhoto}`
})

export const getStaticPaths = async (): Promise<GetStaticPathsResult> => {
    const manifest: HistoryChapterMeta[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
    return {
        paths: manifest.map(({ slug }) => ({ params: { slug } })),
        fallback: false
    }
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<HistoryChapterPageProps>> => {
            const locale = context.locale ?? 'ru'
            const slug = context.params?.slug

            if (typeof slug !== 'string') {
                return { notFound: true }
            }

            const chapterPath = path.join(CONTENT_DIR, `${slug}.json`)
            if (!fs.existsSync(chapterPath)) {
                return { notFound: true }
            }

            const translations = await serverSideTranslations(locale)
            store.dispatch(setLocale(locale))

            const HOST_IMG = process.env.NEXT_PUBLIC_IMG_HOST || 'http://localhost:8080/'
            const rawChapter: HistoryChapter = JSON.parse(fs.readFileSync(chapterPath, 'utf-8'))
            const chapter = applyHost(HOST_IMG, rawChapter)

            const manifest: HistoryChapterMeta[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
            const currentIndex = manifest.findIndex((c) => c.slug === slug)
            const prevChapter = currentIndex > 0 ? applyHostMeta(HOST_IMG, manifest[currentIndex - 1]) : null
            const nextChapter =
                currentIndex < manifest.length - 1 ? applyHostMeta(HOST_IMG, manifest[currentIndex + 1]) : null

            return {
                props: { ...translations, chapter, prevChapter, nextChapter }
            }
        }
)

export default HistoryChapterPage
