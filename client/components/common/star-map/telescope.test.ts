import { ApiModel } from '@/api'

import { angularSeparation, getFovOutline, getMountTelescope, getVisibleTarget } from './telescope'

const mount = {
    raJ2000: 10.68,
    decJ2000: 41.27,
    parked: false,
    target: { ra: 10.68, dec: 41.27 }
} as ApiModel.ObservatoryMount

describe('telescope marker helpers', () => {
    it('measures the angle between two directions', () => {
        expect(angularSeparation(10, 20, 10, 20)).toBeCloseTo(0)
        expect(angularSeparation(0, 0, 90, 0)).toBeCloseTo(90)
        expect(angularSeparation(0, 89, 180, 89)).toBeCloseTo(2)
    })

    it('shows the GOTO target only when it differs from the pointing', () => {
        const pointing = { ra: 10.68, dec: 41.27 }

        expect(getVisibleTarget({ ...pointing, target: { ra: 10.681, dec: 41.27 } })).toBeUndefined()
        expect(getVisibleTarget({ ...pointing, target: null })).toBeUndefined()
        expect(getVisibleTarget({ ...pointing, target: { ra: 12, dec: 41.27 } })).toStrictEqual({ ra: 12, dec: 41.27 })
    })

    it('outlines the field of view around the center', () => {
        const outline = getFovOutline(100, 0, { width: 2, height: 1 }, 2)

        expect(outline).toHaveLength(8)
        expect(outline[0]).toStrictEqual([99, -0.5])
        expect(outline[2]).toStrictEqual([101, -0.5])
    })

    it('widens the field in RA at high declinations', () => {
        const [corner] = getFovOutline(100, 60, { width: 2, height: 1 }, 1)

        expect(corner?.[0]).toBeCloseTo(98, 5)
    })

    it('draws nothing for a parked or unknown mount', () => {
        expect(getMountTelescope({ ...mount, parked: true })).toBeNull()
        expect(getMountTelescope(null)).toBeNull()
        expect(getMountTelescope(mount, { width: 2, height: 1 })).toMatchObject({ ra: 10.68, dec: 41.27 })
    })

    it('can show where a parked mount looks', () => {
        expect(getMountTelescope({ ...mount, parked: true }, null, true)).toMatchObject({ ra: 10.68, dec: 41.27 })
        expect(getMountTelescope(null, null, true)).toBeNull()
    })
})
