/**
 * Replaces underscores with spaces in the given string.
 * @param {string} objectName - The name of the astronomical object.
 * @returns {string} The modified string with underscores replaced by spaces.
 */
export const formatObjectName = (objectName?: string): string => {
    return objectName?.replace(/_/g, ' ') || ''
}

/**
 * Slices the given text to the specified length, removing all newline characters.
 * Adds an ellipsis if the text is longer than the specified length.
 * @param {string} text - The text to be sliced.
 * @param {number} [length=350] - The maximum length of the sliced text.
 * @returns {string} The sliced text with an ellipsis if it was truncated.
 */
export const sliceText = (text?: string, length: number = 350): string => {
    if (!text?.length) {return ''}

    const cleanedText = text.replace(/(\r\n|\n|\r)/gm, '')
    const sliced = cleanedText.slice(0, length)
    return sliced + (sliced.length < cleanedText.length ? '...' : '')
}

/**
 * Converts a file size in bytes to a human-readable format.
 * @param {number} bytes - The file size in bytes.
 * @returns {string} The humanized file size.
 */
export const humanizeFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) {return '0 Byte'}
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Removes Markdown formatting from the given text.
 * @param {string} text - The text from which to remove Markdown formatting.
 * @returns {string} The text without Markdown formatting.
 */
export const removeMarkdown = (text?: string): string => {
    if (!text?.length) {return ''}

    // Remove headers (#, ##, ###, etc.)
    let result = text.replace(/^#+\s+/gm, '')

    // Remove links [text](link) and ![text](link)
    result = result.replace(/!?\[.*?\]\(.*?\)/g, '')

    // Remove inline code (`code`) and multiple quotes
    result = result.replace(/`{1,3}.*?`{1,3}/g, '')

    // Remove code blocks (``` or ~~~)
    result = result.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '')

    // Remove formatting (**text**, *text*, __text__, _text_)
    result = result.replace(/(\*\*|__)(.*?)\1/g, '$2')
    result = result.replace(/(\*|_)(.*?)\1/g, '$2')

    // Remove strikethrough text (~~text~~)
    result = result.replace(/~~(.*?)~~/g, '$1')

    // Remove HTML tags (found in some Markdown)
    result = result.replace(/<[^>]*>/g, '')

    // Remove lists (-, *, + at the beginning of the line)
    result = result.replace(/^\s*([-*+])\s+/gm, '')

    // Remove quotes (> at the beginning of the line)
    result = result.replace(/^\s*>\s+/gm, '')

    // Remove tables (|---|---|) and separators
    result = result.replace(/^\|.*?\|$/gm, '')
    result = result.replace(/^\s*[-|:]+\s*$/gm, '')

    // Remove excessive spaces
    result = result.trim().replace(/\s+/g, ' ')

    return result
}
