import { Dispatch, SetStateAction, useEffect, useState } from 'react'

/**
 * A debounced mirror of `value`: after `delay` ms without `value` changing again, the
 * returned value catches up to it. Also returns a setter so callers can bypass the
 * debounce entirely when a value needs to sync immediately - e.g. hydrating a search
 * filter from the URL on Back/Forward navigation, where waiting out the debounce would
 * show a stale filtered list for no good reason.
 *
 * Extracted from three near-identical inline implementations (`admin/users`, `objects`,
 * `photos` list pages) that each debounced a search input before using it as a query
 * param / syncing it to the URL.
 */
export const useDebouncedValue = <T>(value: T, delay: number): [T, Dispatch<SetStateAction<T>>] => {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)

        return () => clearTimeout(timer)
    }, [value, delay])

    return [debouncedValue, setDebouncedValue]
}

export default useDebouncedValue
