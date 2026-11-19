import React, { useEffect, useRef, useState } from 'react'

import { prefersReducedMotion } from '@/utils/helpers'

interface CounterProps {
    end: number
    duration?: number
    className?: string
    style?: React.CSSProperties
}

/**
 * A number that counts up from 0 when it scrolls into view. The server HTML and the first paint
 * carry the real number (search engines and readers without JS see it); a counter already on
 * screen when the page opens keeps it, only one below the fold is reset to 0 and counts up.
 */
export const Counter: React.FC<CounterProps> = ({ end, duration = 2000, className, style }) => {
    const [count, setCount] = useState(end)
    const [mode, setMode] = useState<'static' | 'waiting' | 'animate'>('static')
    const elementRef = useRef<HTMLSpanElement>(null)

    // A static number follows its value (the data may arrive after the first paint)
    useEffect(() => {
        if (mode === 'static') {
            setCount(end)
        }
    }, [end, mode])

    useEffect(() => {
        const element = elementRef.current

        if (!element || prefersReducedMotion()) {
            return
        }

        const rect = element.getBoundingClientRect()

        if (rect.top < window.innerHeight && rect.bottom >= 0) {
            return
        }

        setCount(0)
        setMode('waiting')

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setMode('animate')
                    observer.disconnect()
                }
            },
            { threshold: 0.1 }
        )

        observer.observe(element)

        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (mode !== 'animate') {
            return
        }

        let frame = 0
        let startTime: number | null = null

        const step = (timestamp: number) => {
            startTime ??= timestamp

            const progress = Math.min((timestamp - startTime) / duration, 1)

            setCount(progress < 1 ? Math.floor(progress * end) : end)

            if (progress < 1) {
                frame = requestAnimationFrame(step)
            }
        }

        frame = requestAnimationFrame(step)

        return () => cancelAnimationFrame(frame)
    }, [mode, end, duration])

    return (
        <span
            ref={elementRef}
            className={className}
            style={style}
        >
            {count}
        </span>
    )
}
