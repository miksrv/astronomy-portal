import { ApiModel } from '@/api'

/** Broadband first, then narrowband: the order filters are listed in everywhere */
export const FILTERS_ORDER: ApiModel.FilterTypes[] = ['L', 'R', 'G', 'B', 'H', 'O', 'S', 'N']

/** How a filter is named to people: the narrowband ones by their emission line */
export const FILTER_LABELS: Record<ApiModel.FilterTypes, string> = {
    L: 'L',
    R: 'R',
    G: 'G',
    B: 'B',
    H: 'Hα',
    O: 'OIII',
    S: 'SII',
    N: 'N'
}

/** Exposure, seconds, per filter in the canonical order, without the empty ones */
export const getFilterExposures = (
    filters?: ApiModel.Filters
): Array<{ filter: ApiModel.FilterTypes; exposure: number; frames: number }> =>
    FILTERS_ORDER.filter((filter) => !!filters?.[filter]?.exposure).map((filter) => ({
        filter,
        exposure: filters?.[filter]?.exposure ?? 0,
        frames: filters?.[filter]?.frames ?? 0
    }))
