import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Markdown from 'react-markdown'

import { readFileSync } from 'fs'
import { join } from 'path'

import { DEFAULT_LOCALE } from '@/utils/constants'
import {
    ContentPageData,
    ContentPageName,
    ContentStep,
    escapeHtml,
    htmlToText,
    localizedHref,
    optimizedImage,
    PHOTO_FULL_WIDTH,
    PHOTO_WIDTHS,
    slugify,
    splitFrontMatter,
    splitSections
} from '@/utils/content'

interface HastNode {
    type: string
    tagName?: string
    value?: string
    children?: HastNode[]
}

// A row of photos holds at most this many; more go on the next rows
const GALLERY_COLUMNS = 4

const textOf = (node?: HastNode): string =>
    node?.type === 'text' ? (node.value ?? '') : (node?.children ?? []).map(textOf).join('')

/** A paragraph of nothing but images (`![a](x) ![b](y)` on one line or on adjacent lines) */
const isGallery = (node?: HastNode): boolean => {
    const children = node?.children ?? []

    return (
        children.some((child) => child.tagName === 'img') &&
        children.every((child) => child.tagName === 'img' || (child.type === 'text' && !child.value?.trim()))
    )
}

/**
 * Renders Markdown to HTML in the page's language. Site links get the locale prefix, other
 * sites open in a new tab; a paragraph of images only is a row of photos for the lightbox
 * (`content-gallery`, served by the Next.js optimizer); a list item that opens with a `###` is a
 * step, collected into `steps`. Raw HTML in the source is escaped.
 */
const render = (source: string, locale: string, steps: ContentStep[]): string =>
    renderToStaticMarkup(
        <Markdown
            components={{
                a: ({ href, children }) => {
                    const link = typeof href === 'string' ? href : ''

                    return /^https?:\/\//.test(link) ? (
                        <a
                            href={link}
                            rel={'nofollow noopener'}
                            target={'_blank'}
                        >
                            {children}
                        </a>
                    ) : (
                        <a href={localizedHref(link, locale)}>{children}</a>
                    )
                },
                // A photo is a button of the page's lightbox: the optimizer's sizes for the row,
                // the large one for the lightbox (`data-full`), the alt text as its caption
                img: ({ src, alt }) => {
                    const link = typeof src === 'string' ? src : ''

                    return (
                        <button
                            type={'button'}
                            className={'content-photo'}
                            aria-label={alt || undefined}
                        >
                            {/* Static HTML made on the server: `next/image` cannot hydrate here, so the
                                optimizer's addresses are written by hand (`optimizedImage`) */}
                            {/* eslint-disable-next-line next/no-img-element */}
                            <img
                                src={optimizedImage(link, 1080)}
                                srcSet={
                                    link.startsWith('/')
                                        ? PHOTO_WIDTHS.map((width) => `${optimizedImage(link, width)} ${width}w`).join(
                                              ', '
                                          )
                                        : undefined
                                }
                                sizes={'(max-width: 768px) 50vw, 25vw'}
                                alt={alt ?? ''}
                                loading={'lazy'}
                                decoding={'async'}
                                data-full={optimizedImage(link, PHOTO_FULL_WIDTH)}
                            />
                        </button>
                    )
                },
                li: ({ node, children }) => {
                    const items = (node as HastNode | undefined)?.children ?? []
                    const heading = items.find((child) => child.tagName === 'h3')

                    if (heading) {
                        steps.push({
                            text: items
                                .filter((child) => child !== heading)
                                .map(textOf)
                                .join(' ')
                                .replace(/\s+/g, ' ')
                                .trim(),
                            title: textOf(heading).trim()
                        })
                    }

                    return <li>{children}</li>
                },
                // Photos in a paragraph of their own are a row (several rows past four): as many
                // columns as photos, at most four (`data-columns`)
                p: ({ node, children }) => {
                    if (!isGallery(node as HastNode)) {
                        return <p>{children}</p>
                    }

                    const count = (node as HastNode).children?.filter((child) => child.tagName === 'img').length ?? 0

                    return (
                        <div
                            className={'content-gallery'}
                            data-columns={Math.min(count, GALLERY_COLUMNS)}
                        >
                            {children}
                        </div>
                    )
                }
            }}
        >
            {source}
        </Markdown>
    )

const read = (page: ContentPageName, locale: string): string | undefined => {
    try {
        return readFileSync(join(process.cwd(), 'content', `${page}.${locale}.md`), 'utf8')
    } catch {
        return undefined
    }
}

const cache = new Map<string, ContentPageData>()

/**
 * A static text page from its Markdown file of the locale (the Russian one when there is none),
 * rendered on the server: the page shows the HTML as is, the browser loads neither the other
 * language nor a Markdown parser. The front matter gives the page's `title` and `description`;
 * every `##` gets an anchor and is also returned as a section (the FAQ accordion, its structured
 * data). Read from `getStaticProps` only, so the files are needed at build time, not on the
 * server. Kept in memory after the first read, except in development.
 */
export const loadContentPage = (page: ContentPageName, locale: string = DEFAULT_LOCALE): ContentPageData => {
    const key = `${page}.${locale}`
    const cached = process.env.NODE_ENV === 'development' ? undefined : cache.get(key)

    if (cached) {
        return cached
    }

    const source = read(page, locale) ?? read(page, DEFAULT_LOCALE) ?? ''
    const { body, fields } = splitFrontMatter(source)
    const parts = splitSections(body)
    const steps: ContentStep[] = []
    const used = new Map<string, number>()

    const intro = parts.intro ? render(parts.intro, locale, steps) : ''
    const sections = parts.sections.map(({ title, source: text }) => {
        const base = slugify(title) || 'section'
        const count = (used.get(base) ?? 0) + 1
        const html = text ? render(text, locale, steps) : ''

        used.set(base, count)

        return { html, id: count > 1 ? `${base}-${count}` : base, text: htmlToText(html), title }
    })

    const data: ContentPageData = {
        description: fields.description ?? '',
        html: intro + sections.map(({ id, title, html }) => `<h2 id="${id}">${escapeHtml(title)}</h2>${html}`).join(''),
        intro,
        sections,
        steps,
        title: fields.title ?? ''
    }

    cache.set(key, data)

    return data
}
