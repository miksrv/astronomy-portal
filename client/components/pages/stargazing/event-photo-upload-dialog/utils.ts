export const isAbortError = (error: unknown): boolean => (error as { name?: string } | undefined)?.name === 'AbortError'

export const makeItemId = (file: File, index: number): string =>
    `${file.name}-${file.size}-${file.lastModified}-${index}`

export const fileKey = (file: File): string => `${file.name}-${file.size}-${file.lastModified}`
