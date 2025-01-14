import React, { useEffect, useRef, useState } from 'react'

interface CounterProps {
    end: number
    duration?: number
    className?: string
    style?: React.CSSProperties
}

const Counter: React.FC<CounterProps> = ({
    end,
    duration = 2000,
    className,
    style
}) => {
    const [count, setCount] = useState(0)
    const [hasStarted, setHasStarted] = useState(false)
    const elementRef = useRef<HTMLSpanElement>(null)
    const startTime = useRef<number | null>(null)

    useEffect(() => {
        const step = (timestamp: number) => {
            if (!startTime.current) startTime.current = timestamp
            const elapsed = timestamp - startTime.current

            const progress = Math.min(elapsed / duration, 1)
            const currentValue = Math.floor(progress * end)

            setCount(currentValue)

            if (progress < 1) {
                requestAnimationFrame(step)
            } else {
                setCount(end)
            }
        }

        if (hasStarted) {
            startTime.current = null
            requestAnimationFrame(step)
        }
    }, [hasStarted, end, duration])

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setHasStarted(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.1 }
        )

        if (elementRef.current) {
            observer.observe(elementRef.current)
        }

        return () => observer.disconnect()
    }, [])

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

export default Counter
