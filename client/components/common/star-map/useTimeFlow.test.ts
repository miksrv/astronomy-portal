import { act, renderHook } from '@testing-library/react'

import { TIME_RATE_MAX, TIME_RATE_MIN } from './timeFlow'
import { useTimeFlow } from './useTimeFlow'

const PICKED = new Date('2026-03-20T21:00:00Z')
const REACHED = new Date('2026-03-21T03:30:00Z')

const setup = (date: Date | null) => {
    const dateRef = { current: date }
    const setDate = jest.fn((next: Date | null) => {
        dateRef.current = next
    })

    const hook = renderHook(() => useTimeFlow({ dateRef, setDate }))

    /** Stand in for the display's flow loop advancing the clock */
    const advanceClockTo = (when: Date) => {
        hook.result.current.nowRef.current = when
    }

    return { hook, dateRef, setDate, advanceClockTo }
}

describe('useTimeFlow', () => {
    it('starts at real time', () => {
        const { hook } = setup(null)

        expect(hook.result.current.timeRate).toBe(TIME_RATE_MIN)
    })

    it('resolves the selected moment, else the clock', () => {
        const picked = setup(PICKED)
        expect(picked.hook.result.current.resolveDate()).toBe(PICKED)

        const live = setup(null)
        live.advanceClockTo(REACHED)
        expect(live.hook.result.current.resolveDate()).toBe(REACHED)
    })

    it('starts a flow from the picked moment and unpins the map from it', () => {
        const { hook, setDate } = setup(PICKED)

        act(() => hook.result.current.changeTimeRate(2))

        expect(hook.result.current.nowRef.current).toBe(PICKED)
        expect(setDate).toHaveBeenCalledWith(null)
        expect(hook.result.current.timeRate).toBe(2)
    })

    it('starts a flow from the live sky at the actual current instant', () => {
        const { hook, setDate, advanceClockTo } = setup(null)
        const staleTick = new Date(Date.now() - 55_000)

        advanceClockTo(staleTick)

        const before = Date.now()

        act(() => hook.result.current.changeTimeRate(8))

        expect(hook.result.current.nowRef.current.getTime()).toBeGreaterThanOrEqual(before)
        expect(setDate).toHaveBeenCalledWith(null)
        expect(hook.result.current.timeRate).toBe(8)
    })

    it('keeps the running clock when only the speed changes', () => {
        const { hook, setDate, advanceClockTo } = setup(null)

        act(() => hook.result.current.changeTimeRate(2))
        advanceClockTo(REACHED)
        setDate.mockClear()

        act(() => hook.result.current.changeTimeRate(8))

        expect(hook.result.current.nowRef.current).toBe(REACHED)
        expect(setDate).not.toHaveBeenCalled()
        expect(hook.result.current.timeRate).toBe(16)
    })

    it('pins the moment the flow reached when slowed back to real time', () => {
        const { hook, setDate, advanceClockTo } = setup(null)

        act(() => hook.result.current.changeTimeRate(2))
        advanceClockTo(REACHED)
        act(() => hook.result.current.changeTimeRate(0.5))

        expect(setDate).toHaveBeenLastCalledWith(REACHED)
        expect(hook.result.current.timeRate).toBe(TIME_RATE_MIN)
    })

    it('ignores a step that does not change the rate', () => {
        const { hook, setDate } = setup(null)

        act(() => hook.result.current.changeTimeRate(0.5))

        expect(setDate).not.toHaveBeenCalled()
        expect(hook.result.current.timeRate).toBe(TIME_RATE_MIN)
    })

    it('clamps the rate to the allowed band', () => {
        const { hook } = setup(null)

        act(() => hook.result.current.changeTimeRate(TIME_RATE_MAX * 10))

        expect(hook.result.current.timeRate).toBe(TIME_RATE_MAX)
    })

    it('pauses a running flow at the moment it reached', () => {
        const { hook, setDate, advanceClockTo } = setup(null)

        act(() => hook.result.current.changeTimeRate(2))
        advanceClockTo(REACHED)
        act(() => hook.result.current.pauseTimeFlow())

        expect(setDate).toHaveBeenLastCalledWith(REACHED)
        expect(hook.result.current.timeRate).toBe(TIME_RATE_MIN)
    })

    it('pauses the live sky at the current instant', () => {
        const { hook, setDate } = setup(null)
        const before = Date.now()

        act(() => hook.result.current.pauseTimeFlow())

        expect(setDate).toHaveBeenCalledTimes(1)

        const pinned = setDate.mock.calls[0]?.[0] as Date

        expect(pinned.getTime()).toBeGreaterThanOrEqual(before)
    })

    it('keeps a picked moment when paused at real time', () => {
        const { hook, setDate } = setup(PICKED)

        act(() => hook.result.current.pauseTimeFlow())

        expect(setDate).toHaveBeenCalledWith(PICKED)
    })

    it('ends the flow when a moment is picked by hand or cleared', () => {
        const { hook, setDate } = setup(null)

        act(() => hook.result.current.changeTimeRate(8))
        act(() => hook.result.current.selectDate(PICKED))

        expect(setDate).toHaveBeenLastCalledWith(PICKED)
        expect(hook.result.current.timeRate).toBe(TIME_RATE_MIN)

        act(() => hook.result.current.selectDate(null))

        expect(setDate).toHaveBeenLastCalledWith(null)
    })
})
