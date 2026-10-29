import React, { useCallback, useEffect, useState } from 'react'

/**
 * Keyboard highlight for a combobox result list (search panel, city picker): ↑/↓ cycle
 * through the items, Home/End jump to the edges, and the highlight is clamped back to
 * the first item whenever the list shrinks under it. Selection (Enter) and closing
 * (Escape) stay with the caller — they need the item and the panel state.
 */
export type ListNavigation = {
    activeIndex: number
    setActiveIndex: (index: number) => void
    /** Back to the first item (call when the query changes or the list closes) */
    reset: () => void
    /** Handles ArrowDown/ArrowUp/Home/End; returns true (and prevents default) when it did */
    handleKeyDown: (event: React.KeyboardEvent) => boolean
}

export const useListNavigation = (count: number): ListNavigation => {
    const [activeIndex, setActiveIndex] = useState(0)

    useEffect(() => {
        if (activeIndex >= count) {
            setActiveIndex(0)
        }
    }, [count, activeIndex])

    const reset = useCallback(() => setActiveIndex(0), [])

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent): boolean => {
            if (!count) {
                return false
            }

            switch (event.key) {
                case 'ArrowDown':
                    setActiveIndex((index) => (index + 1) % count)
                    break
                case 'ArrowUp':
                    setActiveIndex((index) => (index - 1 + count) % count)
                    break
                case 'Home':
                    setActiveIndex(0)
                    break
                case 'End':
                    setActiveIndex(count - 1)
                    break
                default:
                    return false
            }

            event.preventDefault()
            return true
        },
        [count]
    )

    return { activeIndex, setActiveIndex, reset, handleKeyDown }
}
