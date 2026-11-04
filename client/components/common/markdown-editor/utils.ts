/** What a formatting command does to the text: the new text and the selection to leave */
export interface MarkdownEdit {
    text: string
    selectionStart: number
    selectionEnd: number
}

/**
 * Wraps the selection in a pair of marks (`**bold**`, `*italic*`); with nothing selected, puts
 * a placeholder between them and selects it, so typing replaces it. A selection already wrapped
 * is unwrapped.
 */
export const wrapSelection = (
    text: string,
    start: number,
    end: number,
    mark: string,
    placeholder: string
): MarkdownEdit => {
    const selected = text.slice(start, end)
    const before = text.slice(0, start)
    const after = text.slice(end)

    if (before.endsWith(mark) && after.startsWith(mark)) {
        return {
            text: before.slice(0, -mark.length) + selected + after.slice(mark.length),
            selectionStart: start - mark.length,
            selectionEnd: end - mark.length
        }
    }

    const inner = selected || placeholder

    return {
        text: before + mark + inner + mark + after,
        selectionStart: start + mark.length,
        selectionEnd: start + mark.length + inner.length
    }
}

/**
 * Puts a prefix (`## `, `- `, `1. `, `> `) in front of every line the selection touches, or
 * takes it away when all of them already have it. Numbered lists count up.
 */
export const prefixLines = (text: string, start: number, end: number, prefix: string): MarkdownEdit => {
    const lineStart = text.lastIndexOf('\n', start - 1) + 1
    const nextBreak = text.indexOf('\n', end > start && text[end - 1] === '\n' ? end - 1 : end)
    const lineEnd = nextBreak === -1 ? text.length : nextBreak

    const lines = text.slice(lineStart, lineEnd).split('\n')
    const numbered = prefix === '1. '
    const pattern = numbered ? /^\d+\.\s/ : new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    const remove = lines.every((line) => pattern.test(line))

    const changed = lines
        .map((line, i) => (remove ? line.replace(pattern, '') : (numbered ? `${i + 1}. ` : prefix) + line))
        .join('\n')

    return {
        text: text.slice(0, lineStart) + changed + text.slice(lineEnd),
        selectionStart: lineStart,
        selectionEnd: lineStart + changed.length
    }
}

/** `[selection](https://)` with the address selected, ready to be pasted over */
export const insertLink = (text: string, start: number, end: number, placeholder: string): MarkdownEdit => {
    const label = text.slice(start, end) || placeholder
    const url = 'https://'
    const inserted = `[${label}](${url})`
    const urlStart = start + label.length + 3

    return {
        text: text.slice(0, start) + inserted + text.slice(end),
        selectionStart: urlStart,
        selectionEnd: urlStart + url.length
    }
}
