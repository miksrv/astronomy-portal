import { insertLink, prefixLines, wrapSelection } from './utils'

describe('wrapSelection', () => {
    it('wraps the selection and keeps it selected', () => {
        const edit = wrapSelection('a bright galaxy', 2, 8, '**', 'текст')

        expect(edit.text).toBe('a **bright** galaxy')
        expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('bright')
    })

    it('puts a placeholder in when nothing is selected', () => {
        const edit = wrapSelection('ab', 1, 1, '*', 'текст')

        expect(edit.text).toBe('a*текст*b')
        expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('текст')
    })

    it('unwraps a selection that is already wrapped', () => {
        expect(wrapSelection('a **bright** galaxy', 4, 10, '**', 'текст').text).toBe('a bright galaxy')
    })
})

describe('prefixLines', () => {
    it('prefixes every line the selection touches', () => {
        expect(prefixLines('one\ntwo\nthree', 1, 5, '- ').text).toBe('- one\n- two\nthree')
    })

    it('numbers a list and takes the prefix away again', () => {
        const numbered = prefixLines('one\ntwo', 0, 7, '1. ')

        expect(numbered.text).toBe('1. one\n2. two')
        expect(prefixLines(numbered.text, 0, numbered.text.length, '1. ').text).toBe('one\ntwo')
    })
})

describe('insertLink', () => {
    it('makes the selection a link with the address selected', () => {
        const edit = insertLink('see SIMBAD here', 4, 10, 'текст ссылки')

        expect(edit.text).toBe('see [SIMBAD](https://) here')
        expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('https://')
    })
})
