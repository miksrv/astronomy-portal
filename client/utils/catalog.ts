import { TFunction } from 'i18next'

import { ApiModel } from '@/api'

/** "NGC598" -> "NGC 598", "IC1396" -> "IC 1396"; anything else is returned as is */
export const formatDesignation = (designation?: string | null): string => {
    const match = /^([A-Za-z]+)\s*(\d.*)$/.exec(designation ?? '')

    return match ? `${match[1]} ${match[2]}` : (designation ?? '')
}

/** The names people know an object by: "M 33", "NGC 598" (Messier first) */
export const getCatalogDesignations = (item: Pick<ApiModel.CatalogItem, 'messier' | 'designation'>): string[] => [
    ...(item.messier ? [`M ${item.messier}`] : []),
    ...(item.designation ? [formatDesignation(item.designation)] : [])
]

/** "M 31 · NGC 224" */
export const formatCatalogTitle = (item: Pick<ApiModel.CatalogItem, 'messier' | 'designation'>): string =>
    getCatalogDesignations(item).join(' · ')

/** The human name of an OpenNGC type code; an unknown code is shown as it is */
export const getCatalogTypeLabel = (code: string | null | undefined, t: TFunction): string => {
    if (!code) {
        return ''
    }

    switch (code) {
        case 'G':
            return t('common.catalog-type.galaxy', 'Галактика')
        case 'GCl':
            return t('common.catalog-type.globular-cluster', 'Шаровое скопление')
        case 'OCl':
            return t('common.catalog-type.open-cluster', 'Рассеянное скопление')
        case 'PN':
            return t('common.catalog-type.planetary-nebula', 'Планетарная туманность')
        case 'HII':
            return t('common.catalog-type.hii-region', 'Область HII')
        case 'Neb':
            return t('common.catalog-type.nebula', 'Туманность')
        case 'SNR':
            return t('common.catalog-type.supernova-remnant', 'Остаток сверхновой')
        case 'Cl+N':
            return t('common.catalog-type.cluster-nebula', 'Скопление с туманностью')
        case '*Ass':
            return t('common.catalog-type.association', 'Звёздная ассоциация')
        case 'RfN':
            return t('common.catalog-type.reflection-nebula', 'Отражательная туманность')
        case 'EmN':
            return t('common.catalog-type.emission-nebula', 'Эмиссионная туманность')
        case 'DrkN':
            return t('common.catalog-type.dark-nebula', 'Тёмная туманность')
        case 'GPair':
            return t('common.catalog-type.galaxy-pair', 'Пара галактик')
        case 'GTrpl':
            return t('common.catalog-type.galaxy-triplet', 'Тройка галактик')
        case 'GGroup':
            return t('common.catalog-type.galaxy-group', 'Группа галактик')
        case '*':
            return t('common.catalog-type.star', 'Звезда')
        case '**':
            return t('common.catalog-type.double-star', 'Двойная звезда')
        case 'Nova':
            return t('common.catalog-type.nova', 'Новая звезда')
        case 'Other':
            return t('common.catalog-type.other', 'Другое')
        default:
            return code
    }
}

const formatArcmin = (value: number, locale: string): string =>
    value.toLocaleString(locale, { maximumFractionDigits: value < 10 ? 1 : 0 })

/** The apparent size in arcminutes: "70 × 40′", "7′" for a round object; `undefined` when unknown */
export const formatCatalogSize = (
    majAxis?: number | null,
    minAxis?: number | null,
    locale: string = 'ru'
): string | undefined => {
    if (!majAxis) {
        return undefined
    }

    const major = formatArcmin(majAxis, locale)
    const minor = minAxis ? formatArcmin(minAxis, locale) : undefined

    return minor && minor !== major ? `${major} × ${minor}′` : `${major}′`
}
