export const toCoordinate = (value: string | undefined, fallback: number): number => {
    const parsed = value !== undefined ? parseFloat(value) : NaN

    return Number.isFinite(parsed) ? parsed : fallback
}

export const toDatePart = (value?: string): string | undefined => value?.split('T')?.[0]
