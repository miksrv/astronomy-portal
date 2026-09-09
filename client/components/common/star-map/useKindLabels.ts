import { useTranslation } from 'next-i18next/pages'

import { SearchItemKind } from './searchIndex'

/**
 * Human-readable object-kind labels ("Звезда", "Созвездие", …) shared by the search
 * results and the info popup header, so both panels name a kind the same way.
 * Literal t() calls keep the keys visible to the locale scanner.
 */
export const useKindLabels = (): Record<SearchItemKind, string> => {
    const { t } = useTranslation()

    return {
        star: t('components.common.star-map.info.kind-star', 'Звезда'),
        dso: t('components.common.star-map.info.kind-dso', 'Объект глубокого космоса'),
        planet: t('components.common.star-map.info.kind-planet', 'Планета'),
        sun: t('components.common.star-map.info.kind-sun', 'Солнце'),
        moon: t('components.common.star-map.info.kind-moon', 'Луна'),
        radiant: t('components.common.star-map.info.kind-radiant', 'Радиант метеорного потока'),
        constellation: t('components.common.star-map.info.kind-constellation', 'Созвездие'),
        portal: t('components.common.star-map.info.kind-portal', 'Астрофото портала')
    }
}
