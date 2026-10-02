import React from 'react'

import { act, renderHook } from '@testing-library/react'

import { useListNavigation } from './useListNavigation'

const keyEvent = (key: string) => {
    const preventDefault = jest.fn()
    return { event: { key, preventDefault } as unknown as React.KeyboardEvent, preventDefault }
}

describe('useListNavigation', () => {
    it('starts on the first item', () => {
        const { result } = renderHook(() => useListNavigation(3))

        expect(result.current.activeIndex).toBe(0)
    })

    it('cycles forward with ArrowDown and wraps to the start', () => {
        const { result } = renderHook(() => useListNavigation(3))

        act(() => void result.current.handleKeyDown(keyEvent('ArrowDown').event))
        act(() => void result.current.handleKeyDown(keyEvent('ArrowDown').event))
        expect(result.current.activeIndex).toBe(2)

        act(() => void result.current.handleKeyDown(keyEvent('ArrowDown').event))
        expect(result.current.activeIndex).toBe(0)
    })

    it('cycles backward with ArrowUp and wraps to the end', () => {
        const { result } = renderHook(() => useListNavigation(3))

        act(() => void result.current.handleKeyDown(keyEvent('ArrowUp').event))
        expect(result.current.activeIndex).toBe(2)
    })

    it('jumps with Home and End and prevents the default caret move', () => {
        const { result } = renderHook(() => useListNavigation(4))
        const end = keyEvent('End')
        const home = keyEvent('Home')

        let handled = false
        act(() => {
            handled = result.current.handleKeyDown(end.event)
        })
        expect(handled).toBe(true)
        expect(end.preventDefault).toHaveBeenCalledTimes(1)
        expect(result.current.activeIndex).toBe(3)

        act(() => void result.current.handleKeyDown(home.event))
        expect(result.current.activeIndex).toBe(0)
        expect(home.preventDefault).toHaveBeenCalledTimes(1)
    })

    it('ignores other keys and an empty list', () => {
        const { result } = renderHook(() => useListNavigation(0))
        const down = keyEvent('ArrowDown')
        const enter = keyEvent('Enter')

        let handled = true
        act(() => {
            handled = result.current.handleKeyDown(down.event)
        })
        expect(handled).toBe(false)
        expect(down.preventDefault).not.toHaveBeenCalled()

        const { result: filled } = renderHook(() => useListNavigation(2))
        act(() => {
            handled = filled.current.handleKeyDown(enter.event)
        })
        expect(handled).toBe(false)
        expect(filled.current.activeIndex).toBe(0)
    })

    it('clamps the highlight back to the first item when the list shrinks', () => {
        const { result, rerender } = renderHook(({ count }) => useListNavigation(count), {
            initialProps: { count: 5 }
        })

        act(() => result.current.setActiveIndex(4))
        expect(result.current.activeIndex).toBe(4)

        rerender({ count: 2 })
        expect(result.current.activeIndex).toBe(0)
    })

    it('reset returns to the first item', () => {
        const { result } = renderHook(() => useListNavigation(3))

        act(() => result.current.setActiveIndex(2))
        act(() => result.current.reset())
        expect(result.current.activeIndex).toBe(0)
    })
})
