import { DEFAULT_LOCALE } from '@/utils/constants'

/**
 * The static text pages whose whole text is a Markdown file in `client/content`
 * (`<page>.<locale>.md`), rendered to HTML on the server (`utils/content.server.tsx`)
 */
export type ContentPageName =
    | 'about'
    | 'observatory-overview'
    | 'privacy'
    | 'stargazing-faq'
    | 'stargazing-howto'
    | 'stargazing-rules'
    | 'stargazing-where'

/** A `##` section of a page: its anchor, its heading, its body as HTML and as plain text */
export interface ContentSection {
    id: string
    title: string
    html: string
    text: string
}

/** A list item that opens with a `###` heading: a step of a plan (the HowTo structured data) */
export interface ContentStep {
    title: string
    text: string
}

/** A page's text and the fields of its front matter */
export interface ContentPageData {
    /** The `title` of the front matter: the page's `h1` and SEO title */
    title: string
    /** The `description` of the front matter: the SEO description */
    description: string
    /** The whole text as HTML, every `##` with an anchor */
    html: string
    /** The text before the first `##`, as HTML */
    intro: string
    sections: ContentSection[]
    steps: ContentStep[]
}

// Widths of a page's photos made by the Next.js image optimizer (`/_next/image`, cached on the
// server): each one is a default `deviceSizes` width, the quality is the default one
export const PHOTO_WIDTHS = [640, 828, 1080, 1920]
export const PHOTO_FULL_WIDTH = 1920
const PHOTO_QUALITY = 75

/** A photo of the site's own (`/photos/...`) through the optimizer; any other address as is */
export const optimizedImage = (src: string, width: number): string =>
    src.startsWith('/') ? `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${PHOTO_QUALITY}` : src

/**
 * A link of the text in the page's language: the files name a site page by its path
 * (`/stargazing/faq`), the English pages live under `/en`
 */
export const localizedHref = (href: string, locale: string): string => {
    if (!href.startsWith('/') || href.startsWith('//') || locale === DEFAULT_LOCALE) {
        return href
    }

    return `/${locale}${href === '/' ? '' : href}`
}

/** The path of a site link without the locale prefix: what the router navigates to */
export const routerPath = (href: string, locale?: string): string => {
    if (!locale || locale === DEFAULT_LOCALE) {
        return href
    }

    const prefix = `/${locale}`

    return href === prefix ? '/' : href.startsWith(`${prefix}/`) ? href.slice(prefix.length) : href
}

/** An anchor of a heading in its own language: «Что брать с собой?» → `что-брать-с-собой` */
export const slugify = (text: string): string =>
    text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')

/**
 * Splits the front matter off a file: a `---` block of `key: value` lines on top. No YAML beyond
 * that: a value is one line of plain text, quotes included.
 */
export const splitFrontMatter = (source: string): { body: string; fields: Record<string, string> } => {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)

    if (!match) {
        return { body: source, fields: {} }
    }

    const fields: Record<string, string> = {}

    for (const line of (match[1] ?? '').split(/\r?\n/)) {
        const separator = line.indexOf(':')

        if (separator > 0) {
            fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
        }
    }

    return { body: source.slice(match[0].length), fields }
}

/**
 * Splits a text by its `##` headings: the text before the first one, then every section with its
 * heading and its Markdown. A `##` inside a fenced code block is not a heading.
 */
export const splitSections = (body: string): { intro: string; sections: Array<{ title: string; source: string }> } => {
    const intro: string[] = []
    const sections: Array<{ title: string; lines: string[] }> = []
    let fenced = false

    for (const line of body.split(/\r?\n/)) {
        if (/^\s*(```|~~~)/.test(line)) {
            fenced = !fenced
        }

        const heading = fenced ? null : /^##\s+(.+?)\s*#*\s*$/.exec(line)

        if (heading) {
            sections.push({ lines: [], title: heading[1] ?? '' })
        } else if (sections.length) {
            sections[sections.length - 1]?.lines.push(line)
        } else {
            intro.push(line)
        }
    }

    return {
        intro: intro.join('\n').trim(),
        sections: sections.map(({ title, lines }) => ({ source: lines.join('\n').trim(), title }))
    }
}

const ENTITIES: Record<string, string> = {
    '&#x27;': '\u0027',
    '&#39;': '\u0027',
    '&amp;': '&',
    '&gt;': '>',
    '&lt;': '<',
    '&quot;': '"'
}

/**
 * Plain text of rendered HTML (structured data): one line, a block tag is a space, an inline one
 * (a link, emphasis) is nothing, so «наш <a>канал</a>, где» stays «наш канал, где»
 */
export const htmlToText = (html: string): string =>
    html
        .replace(/<\/?(?:p|li|ul|ol|h[1-6]|br|div|blockquote|button|img)\b[^>]*>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, (entity) => ENTITIES[entity] ?? entity)
        .replace(/\s+/g, ' ')
        .trim()

/** Escapes text for HTML made by hand (a heading of a section) */
export const escapeHtml = (text: string): string =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
