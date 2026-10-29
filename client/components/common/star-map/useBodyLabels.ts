import { useMemo } from 'react'

import { useTranslation } from 'next-i18next/pages'

/** Localized display names for solar-system bodies, keyed by astronomy-engine Body name. */
export const useBodyLabels = (): Record<string, string> => {
    const { t } = useTranslation()

    return useMemo(
        () => ({
            Sun: t('components.common.star-map.bodies.sun', 'Солнце'),
            Moon: t('components.common.star-map.bodies.moon', 'Луна'),
            Mercury: t('components.common.star-map.bodies.mercury', 'Меркурий'),
            Venus: t('components.common.star-map.bodies.venus', 'Венера'),
            Mars: t('components.common.star-map.bodies.mars', 'Марс'),
            Jupiter: t('components.common.star-map.bodies.jupiter', 'Юпитер'),
            Saturn: t('components.common.star-map.bodies.saturn', 'Сатурн'),
            Uranus: t('components.common.star-map.bodies.uranus', 'Уран'),
            Neptune: t('components.common.star-map.bodies.neptune', 'Нептун')
        }),
        [t]
    )
}
