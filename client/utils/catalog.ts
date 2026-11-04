import { TFunction } from 'i18next'

/** SIMBAD object types (`otype`, https://simbad.cds.unistra.fr/guide/otypes.htx) by the label shown for them */
const GALAXY_TYPES = [
    'G',
    'GiG',
    'GiC',
    'GiP',
    'BiC',
    'AGN',
    'SyG',
    'Sy1',
    'Sy2',
    'LIN',
    'SBG',
    'H2G',
    'EmG',
    'rG',
    'LSB',
    'bCG'
]
const NEBULA_TYPES = ['GNe', 'ISM', 'EmO', 'sh', 'bub']

/** The human name of a SIMBAD object type; nothing for a type we don't name (better no label than a code) */
export const getObjectTypeLabel = (code: string | null | undefined, t: TFunction): string | undefined => {
    if (!code) {
        return undefined
    }

    if (GALAXY_TYPES.includes(code)) {
        return t('common.object-type.galaxy', 'Галактика')
    }

    if (NEBULA_TYPES.includes(code)) {
        return t('common.object-type.nebula', 'Туманность')
    }

    switch (code) {
        case 'PaG':
        case 'IG':
            return t('common.object-type.interacting-galaxies', 'Взаимодействующие галактики')
        case 'GrG':
        case 'CGG':
            return t('common.object-type.galaxy-group', 'Группа галактик')
        case 'ClG':
            return t('common.object-type.galaxy-cluster', 'Скопление галактик')
        case 'GlC':
            return t('common.object-type.globular-cluster', 'Шаровое скопление')
        case 'OpC':
            return t('common.object-type.open-cluster', 'Рассеянное скопление')
        case 'Cl*':
            return t('common.object-type.star-cluster', 'Звёздное скопление')
        case 'As*':
            return t('common.object-type.association', 'Звёздная ассоциация')
        case 'PN':
            return t('common.object-type.planetary-nebula', 'Планетарная туманность')
        case 'HII':
            return t('common.object-type.hii-region', 'Область HII')
        case 'SNR':
            return t('common.object-type.supernova-remnant', 'Остаток сверхновой')
        case 'RNe':
            return t('common.object-type.reflection-nebula', 'Отражательная туманность')
        case 'DNe':
        case 'Cld':
        case 'MoC':
            return t('common.object-type.dark-nebula', 'Тёмная туманность')
        case 'SN*':
            return t('common.object-type.supernova', 'Сверхновая')
        case 'No*':
            return t('common.object-type.nova', 'Новая звезда')
        case '**':
            return t('common.object-type.double-star', 'Двойная звезда')
        default:
            // The many kinds of single stars: `*`, `PM*`, `V*`, `WR*`…
            return code.endsWith('*') ? t('common.object-type.star', 'Звезда') : undefined
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

/** The object's page in SIMBAD */
export const getSimbadUrl = (simbadId: string): string =>
    `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(simbadId)}`
