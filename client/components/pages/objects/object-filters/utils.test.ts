import { getSignalSummary } from './utils'

describe('getSignalSummary', () => {
    it('splits the exposure into narrowband and broadband and averages per frame and night', () => {
        const summary = getSignalSummary(
            { H: { exposure: 3000, frames: 10 }, L: { exposure: 1000, frames: 20 } },
            { exposure: 4000, frames: 30 },
            2
        )

        expect(summary.narrowbandShare).toBeCloseTo(0.75)
        expect(summary.frameExposure).toBeCloseTo(133.3, 0)
        expect(summary.perNight).toBe(2000)
    })

    it('has no averages without frames or nights', () => {
        expect(getSignalSummary(undefined, undefined, undefined)).toStrictEqual({
            narrowbandShare: 0,
            frameExposure: undefined,
            perNight: undefined
        })
    })
})
