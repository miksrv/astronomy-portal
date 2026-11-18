import {
    escapeHtml,
    htmlToText,
    localizedHref,
    optimizedImage,
    routerPath,
    slugify,
    splitFrontMatter,
    splitSections
} from './content'

describe('utils/content', () => {
    describe('splitFrontMatter', () => {
        it('reads the key: value lines and returns the body after them', () => {
            const { body, fields } = splitFrontMatter(
                '---\ntitle: Правила\ndescription: Что можно: и что нельзя\n---\n\nТекст'
            )

            expect(fields).toStrictEqual({ description: 'Что можно: и что нельзя', title: 'Правила' })
            expect(body).toBe('\nТекст')
        })

        it('returns the whole source when there is no front matter', () => {
            expect(splitFrontMatter('# Текст')).toStrictEqual({ body: '# Текст', fields: {} })
        })
    })

    describe('splitSections', () => {
        it('splits the text by its ## headings, the text before them is the intro', () => {
            const { intro, sections } = splitSections('Вступление\n\n## Первый\n\nОдин\n\n### Под\n\n## Второй\nДва')

            expect(intro).toBe('Вступление')
            expect(sections).toStrictEqual([
                { source: 'Один\n\n### Под', title: 'Первый' },
                { source: 'Два', title: 'Второй' }
            ])
        })

        it('does not take a ## inside a fenced code block for a heading', () => {
            const { sections } = splitSections('## Код\n\n```\n## не заголовок\n```')

            expect(sections).toHaveLength(1)
            expect(sections[0]?.source).toContain('## не заголовок')
        })
    })

    describe('slugify', () => {
        it('keeps the letters of any language and joins the words with hyphens', () => {
            expect(slugify('Что брать с собой?')).toBe('что-брать-с-собой')
            expect(slugify('1. General provisions')).toBe('1-general-provisions')
        })
    })

    describe('localizedHref', () => {
        it('prefixes a site link with the locale, except for the default one', () => {
            expect(localizedHref('/stargazing/faq', 'en')).toBe('/en/stargazing/faq')
            expect(localizedHref('/', 'en')).toBe('/en')
            expect(localizedHref('/stargazing/faq', 'ru')).toBe('/stargazing/faq')
        })

        it('leaves other sites and protocol-relative links as they are', () => {
            expect(localizedHref('https://t.me/look_at_stars', 'en')).toBe('https://t.me/look_at_stars')
            expect(localizedHref('//example.com/x', 'en')).toBe('//example.com/x')
        })
    })

    describe('routerPath', () => {
        it('takes the locale prefix off a site link', () => {
            expect(routerPath('/en/stargazing/faq', 'en')).toBe('/stargazing/faq')
            expect(routerPath('/en', 'en')).toBe('/')
            expect(routerPath('/stargazing', 'ru')).toBe('/stargazing')
            expect(routerPath('/english', 'en')).toBe('/english')
        })
    })

    describe('optimizedImage', () => {
        it('serves a photo of the site through the Next.js optimizer', () => {
            expect(optimizedImage('/photos/a b.jpeg', 640)).toBe('/_next/image?url=%2Fphotos%2Fa%20b.jpeg&w=640&q=75')
            expect(optimizedImage('https://example.com/a.jpeg', 640)).toBe('https://example.com/a.jpeg')
        })
    })

    describe('htmlToText', () => {
        it('drops inline tags without spaces and turns block tags into one', () => {
            expect(htmlToText('<p>Наш <a href="/x">канал</a>, где мы</p><p>Второй &amp; &quot;третий&quot;</p>')).toBe(
                'Наш канал, где мы Второй & "третий"'
            )
        })
    })

    describe('escapeHtml', () => {
        it('escapes the characters that would break HTML', () => {
            expect(escapeHtml('<b> & "x"')).toBe('&lt;b&gt; &amp; &quot;x&quot;')
        })
    })
})
