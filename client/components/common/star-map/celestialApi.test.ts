import { readCenter, readZoomFactor, withoutAnimations } from './celestialApi'

type CelestialMock = {
    zoomBy?: jest.Mock
    rotate?: jest.Mock
    apply?: jest.Mock
}

const installCelestial = (mock: CelestialMock) => {
    ;(globalThis as unknown as { Celestial: CelestialMock }).Celestial = mock
}

describe('celestialApi', () => {
    let warn: jest.SpyInstance

    beforeEach(() => {
        warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    })

    afterEach(() => {
        warn.mockRestore()
        Reflect.deleteProperty(globalThis, 'Celestial')
    })

    describe('readZoomFactor', () => {
        it('returns the positive finite factor reported by Celestial.zoomBy()', () => {
            installCelestial({ zoomBy: jest.fn(() => 1.5) })

            expect(readZoomFactor()).toBe(1.5)
        })

        it.each([0, -1, NaN, Infinity, undefined, 'x'])('rejects %p', (value) => {
            installCelestial({ zoomBy: jest.fn(() => value) })

            expect(readZoomFactor()).toBeNull()
        })

        it('returns null when the getter is missing or throws', () => {
            installCelestial({})
            expect(readZoomFactor()).toBeNull()

            installCelestial({
                zoomBy: jest.fn(() => {
                    throw new Error('not displayed')
                })
            })
            expect(readZoomFactor()).toBeNull()
        })
    })

    describe('readCenter', () => {
        it('returns the [ra, dec, orientation] triple reported by Celestial.rotate()', () => {
            installCelestial({ rotate: jest.fn(() => [10, -20, 30]) })

            expect(readCenter()).toStrictEqual([10, -20, 30])
        })

        it.each([undefined, null, [1, 2], [1, NaN, 3], 'center'])('rejects %p', (value) => {
            installCelestial({ rotate: jest.fn(() => value) })

            expect(readCenter()).toBeUndefined()
        })

        it('returns undefined when the getter is missing or throws', () => {
            installCelestial({})
            expect(readCenter()).toBeUndefined()

            installCelestial({
                rotate: jest.fn(() => {
                    throw new Error('not displayed')
                })
            })
            expect(readCenter()).toBeUndefined()
        })
    })

    describe('withoutAnimations', () => {
        it('switches animations off around the callback and back on afterwards', () => {
            const apply = jest.fn()
            const run = jest.fn(() => {
                expect(apply).toHaveBeenLastCalledWith({ disableAnimations: true })
            })

            installCelestial({ apply })
            withoutAnimations(run)

            expect(run).toHaveBeenCalledTimes(1)
            expect(apply.mock.calls).toStrictEqual([[{ disableAnimations: true }], [{ disableAnimations: false }]])
        })

        it('restores the flag even when the callback throws', () => {
            const apply = jest.fn()

            installCelestial({ apply })
            withoutAnimations(() => {
                throw new Error('boom')
            })

            expect(apply).toHaveBeenLastCalledWith({ disableAnimations: false })
            expect(warn).toHaveBeenCalled()
        })

        it('just runs the callback when animations are already disabled', () => {
            const apply = jest.fn()
            const run = jest.fn()

            installCelestial({ apply })
            withoutAnimations(run, true)

            expect(run).toHaveBeenCalledTimes(1)
            expect(apply).not.toHaveBeenCalled()
        })

        it('reports but swallows a throwing callback in the already-disabled path', () => {
            installCelestial({ apply: jest.fn() })

            expect(() =>
                withoutAnimations(() => {
                    throw new Error('boom')
                }, true)
            ).not.toThrow()
            expect(warn).toHaveBeenCalled()
        })
    })
})
