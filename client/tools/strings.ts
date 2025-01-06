/**
 * Replaces underscores with spaces in the given string.
 * @param {string} objectName - The name of the astronomical object.
 * @returns {string} The modified string with underscores replaced by spaces.
 */
export const formatObjectName = (objectName: string): string => {
    return objectName.replace(/_/g, ' ')
}

/**
 * Slices the given text to the specified length, removing all newline characters.
 * Adds an ellipsis if the text is longer than the specified length.
 * @param {string} text - The text to be sliced.
 * @param {number} [length=350] - The maximum length of the sliced text.
 * @returns {string} The sliced text with an ellipsis if it was truncated.
 */
export const sliceText = (text?: string, length: number = 350): string => {
    if (!text?.length) return ''

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
    if (bytes === 0) return '0 Byte'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i]
}
