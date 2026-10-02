import { act, renderHook } from '@testing-library/react'

import { LIVE_CLOCK_INTERVAL_MS, useLiveClock } from './useLiveClock'

const INTERVAL = 1000

/** Override jsdom's document.visibilityState (an own property shadows the prototype getter). */
const setVisibilityState = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}

const fireVisibilityChange = () => {
    act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
    })
}

const advance = (ms: number) => {
    act(() => {
        jest.advanceTimersByTime(ms)
    })
}

describe('useLiveClock', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        setVisibilityState('visible')
    })

    afterEach(() => {
        jest.useRealTimers()
        // Drop the instance override so the prototype getter is back in charge
        Reflect.deleteProperty(document, 'visibilityState')
    })

    it('exports a one-minute default interval', () => {
        expect(LIVE_CLOCK_INTERVAL_MS).toBe(60_000)
    })

    it('ticks on every interval while enabled', () => {
        const onTick = jest.fn()

        renderHook(() => useLiveClock(true, onTick, INTERVAL))

        expect(onTick).not.toHaveBeenCalled()

        advance(INTERVAL * 3)

        expect(onTick).toHaveBeenCalledTimes(3)
    })

    it('does not tick while disabled', () => {
        const onTick = jest.fn()

        renderHook(() => useLiveClock(false, onTick, INTERVAL))

        advance(INTERVAL * 5)

        expect(onTick).not.toHaveBeenCalled()
    })

    it('starts ticking once enabled and stops again when disabled', () => {
        const onTick = jest.fn()

        const { rerender } = renderHook(
            ({ enabled }: { enabled: boolean }) => useLiveClock(enabled, onTick, INTERVAL),
            {
                initialProps: { enabled: false }
            }
        )

        advance(INTERVAL)
        expect(onTick).not.toHaveBeenCalled()

        rerender({ enabled: true })
        advance(INTERVAL * 2)
        expect(onTick).toHaveBeenCalledTimes(2)

        rerender({ enabled: false })
        advance(INTERVAL * 2)
        expect(onTick).toHaveBeenCalledTimes(2)
    })

    it('always invokes the latest callback without restarting the interval', () => {
        const first = jest.fn()
        const second = jest.fn()

        const { rerender } = renderHook(({ onTick }: { onTick: () => void }) => useLiveClock(true, onTick, INTERVAL), {
            initialProps: { onTick: first }
        })

        advance(INTERVAL / 2)
        rerender({ onTick: second })
        // Half an interval later the original schedule fires — with the new callback
        advance(INTERVAL / 2)

        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledTimes(1)
    })

    it('does not tick while the document is hidden', () => {
        const onTick = jest.fn()

        setVisibilityState('hidden')
        renderHook(() => useLiveClock(true, onTick, INTERVAL))

        advance(INTERVAL * 3)

        expect(onTick).not.toHaveBeenCalled()
    })

    it('stops ticking when the document becomes hidden', () => {
        const onTick = jest.fn()

        renderHook(() => useLiveClock(true, onTick, INTERVAL))

        advance(INTERVAL)
        expect(onTick).toHaveBeenCalledTimes(1)

        setVisibilityState('hidden')
        fireVisibilityChange()
        advance(INTERVAL * 3)

        expect(onTick).toHaveBeenCalledTimes(1)
    })

    it('catches up once immediately when the document becomes visible, then resumes the cadence', () => {
        const onTick = jest.fn()

        setVisibilityState('hidden')
        renderHook(() => useLiveClock(true, onTick, INTERVAL))

        advance(INTERVAL * 2)
        expect(onTick).not.toHaveBeenCalled()

        setVisibilityState('visible')
        fireVisibilityChange()
        expect(onTick).toHaveBeenCalledTimes(1)

        advance(INTERVAL - 1)
        expect(onTick).toHaveBeenCalledTimes(1)

        advance(1)
        expect(onTick).toHaveBeenCalledTimes(2)
    })

    it('clears the interval and the visibility listener on unmount', () => {
        const onTick = jest.fn()

        const { unmount } = renderHook(() => useLiveClock(true, onTick, INTERVAL))

        advance(INTERVAL)
        expect(onTick).toHaveBeenCalledTimes(1)

        unmount()

        advance(INTERVAL * 3)
        fireVisibilityChange()

        expect(onTick).toHaveBeenCalledTimes(1)
    })
})
