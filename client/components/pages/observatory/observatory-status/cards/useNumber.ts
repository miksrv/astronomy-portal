import { useCallback } from 'react'

import { useTranslation } from 'next-i18next/pages'

/** A number in the visitor's locale with a limited number of decimals */
export const useNumber = (): ((value: number, digits?: number) => string) => {
    const { i18n } = useTranslation()

    return useCallback(
        (value: number, digits = 1) => value.toLocaleString(i18n.language, { maximumFractionDigits: digits }),
        [i18n.language]
    )
}
