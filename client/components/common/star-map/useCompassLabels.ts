import { useMemo } from 'react'

import { useTranslation } from 'next-i18next/pages'

export type CompassPointKey = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

export type CompassLabels = Record<CompassPointKey, string>

/**
 * Localized compass-point abbreviations, shared by the horizon-mode compass (custom
 * layers), the status chip's hemisphere letters and the object info panel's azimuth.
 * Literal t() calls so the i18n scanner keeps every key.
 */
export const useCompassLabels = (): CompassLabels => {
    const { t } = useTranslation()

    return useMemo(
        () => ({
            n: t('components.common.star-map.compass.n', 'С'),
            ne: t('components.common.star-map.compass.ne', 'СВ'),
            e: t('components.common.star-map.compass.e', 'В'),
            se: t('components.common.star-map.compass.se', 'ЮВ'),
            s: t('components.common.star-map.compass.s', 'Ю'),
            sw: t('components.common.star-map.compass.sw', 'ЮЗ'),
            w: t('components.common.star-map.compass.w', 'З'),
            nw: t('components.common.star-map.compass.nw', 'СЗ')
        }),
        [t]
    )
}
