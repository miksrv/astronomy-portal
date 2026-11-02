import { RefObject, useEffect, useState } from 'react'

/**
 * Becomes `true` once the element has scrolled within `rootMargin` of the viewport, and stays
 * so. Work that isn't needed for the first screen (camera frames, relay states) waits for it,
 * so the requests above the fold aren't queued behind slow ones below.
 */
export const useInView = (ref: RefObject<Element | null>, rootMargin: string = '200px'): boolean => {
    const [inView, setInView] = useState(false)

    useEffect(() => {
        const element = ref.current

        if (!element || inView) {
            return
        }

        if (typeof IntersectionObserver === 'undefined') {
            setInView(true)

            return
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setInView(true)
                    observer.disconnect()
                }
            },
            { rootMargin }
        )

        observer.observe(element)

        return () => observer.disconnect()
    }, [ref, rootMargin, inView])

    return inView
}
