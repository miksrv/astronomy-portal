import { humanizeFileSize, removeMarkdown, sliceText } from './strings'

describe('strings', () => {
    describe('removeMarkdown', () => {
        it('returns empty string for undefined', () => {
            expect(removeMarkdown(undefined)).toBe('')
        })

        it('returns empty string for empty string', () => {
            expect(removeMarkdown('')).toBe('')
        })

        it('removes headers', () => {
            expect(removeMarkdown('# Heading 1')).toBe('Heading 1')
            expect(removeMarkdown('## Heading 2')).toBe('Heading 2')
            expect(removeMarkdown('### Heading 3')).toBe('Heading 3')
        })

        it('removes bold formatting', () => {
            expect(removeMarkdown('**bold text**')).toBe('bold text')
            expect(removeMarkdown('__bold text__')).toBe('bold text')
        })

        it('removes italic formatting', () => {
            expect(removeMarkdown('*italic text*')).toBe('italic text')
            expect(removeMarkdown('_italic text_')).toBe('italic text')
        })

        it('removes strikethrough', () => {
            expect(removeMarkdown('~~struck~~')).toBe('struck')
        })

        it('removes inline code', () => {
            expect(removeMarkdown('`code`')).toBe('')
        })

        it('removes links', () => {
            expect(removeMarkdown('[link text](https://example.com)')).toBe('')
        })

        it('removes image links', () => {
            expect(removeMarkdown('![alt text](https://example.com/image.png)')).toBe('')
        })

        it('removes HTML tags', () => {
            expect(removeMarkdown('<strong>text</strong>')).toBe('text')
        })

        it('removes list markers', () => {
            expect(removeMarkdown('- list item')).toBe('list item')
            expect(removeMarkdown('* list item')).toBe('list item')
            expect(removeMarkdown('+ list item')).toBe('list item')
        })

        it('removes blockquotes', () => {
            expect(removeMarkdown('> quoted text')).toBe('quoted text')
        })

        it('returns plain text unchanged', () => {
            expect(removeMarkdown('Hello world')).toBe('Hello world')
        })

        it('trims excess whitespace', () => {
            expect(removeMarkdown('  hello   world  ')).toBe('hello world')
        })
    })

    describe('sliceText', () => {
        it('returns empty string for undefined', () => {
            expect(sliceText(undefined)).toBe('')
        })

        it('returns empty string for empty string', () => {
            expect(sliceText('')).toBe('')
        })

        it('returns text unchanged when shorter than default length', () => {
            const short = 'Short text'
            expect(sliceText(short)).toBe(short)
        })

        it('slices text and adds ellipsis when longer than limit', () => {
            const text = 'a'.repeat(400)
            const result = sliceText(text, 350)
            expect(result).toBe('a'.repeat(350) + '...')
        })

        it('does not add ellipsis when text is exactly the limit', () => {
            const text = 'a'.repeat(350)
            expect(sliceText(text, 350)).toBe(text)
        })

        it('respects custom length parameter', () => {
            const text = 'Hello World'
            const result = sliceText(text, 5)
            expect(result).toBe('Hello...')
        })

        it('removes newline characters before slicing', () => {
            const text = 'Hello\nWorld'
            expect(sliceText(text)).toBe('HelloWorld')
        })

        it('removes carriage return and newline characters', () => {
            const text = 'Hello\r\nWorld'
            expect(sliceText(text)).toBe('HelloWorld')
        })
    })

    describe('humanizeFileSize', () => {
        it('returns "0 Byte" for 0 bytes', () => {
            expect(humanizeFileSize(0)).toBe('0 Byte')
        })

        it('formats bytes', () => {
            expect(humanizeFileSize(512)).toBe('512 Bytes')
        })

        it('formats kilobytes', () => {
            expect(humanizeFileSize(1024)).toBe('1 KB')
        })

        it('formats megabytes', () => {
            expect(humanizeFileSize(1024 * 1024)).toBe('1 MB')
        })

        it('formats gigabytes', () => {
            expect(humanizeFileSize(1024 * 1024 * 1024)).toBe('1 GB')
        })

        it('formats terabytes', () => {
            expect(humanizeFileSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB')
        })

        it('formats fractional kilobytes with 2 decimal places', () => {
            expect(humanizeFileSize(1536)).toBe('1.5 KB')
        })
    })
})
