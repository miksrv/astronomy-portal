import { ApiModel } from '@/api'
import { getFilterExposures } from '@/utils/filters'

const NARROWBAND: ApiModel.FilterTypes[] = ['H', 'O', 'S']

export interface SignalSummary {
    /** Share of the exposure taken through narrowband filters (Hα, OIII, SII), 0..1 */
    narrowbandShare: number
    /** Typical single frame, seconds (total exposure over total frames) */
    frameExposure?: number
    /** Exposure gathered in an average night, seconds */
    perNight?: number
}

/** The figures that say how the signal was gathered, beyond the per-filter bars */
export const getSignalSummary = (
    filters?: ApiModel.Filters,
    statistic?: ApiModel.Statistic,
    nights?: number
): SignalSummary => {
    const rows = getFilterExposures(filters)
    const total = rows.reduce((sum, { exposure }) => sum + exposure, 0)
    const narrowband = rows
        .filter(({ filter }) => NARROWBAND.includes(filter))
        .reduce((sum, { exposure }) => sum + exposure, 0)

    return {
        narrowbandShare: total ? narrowband / total : 0,
        frameExposure: statistic?.exposure && statistic.frames ? statistic.exposure / statistic.frames : undefined,
        perNight: statistic?.exposure && nights ? statistic.exposure / nights : undefined
    }
}
