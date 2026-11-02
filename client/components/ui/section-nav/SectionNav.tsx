import React, { useEffect, useState } from 'react'
import { cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

export interface SectionNavItem {
    /** The section element's id */
    id: string
    label: string
}

interface SectionNavProps {
    items: SectionNavItem[]
    'aria-label': string
    className?: string
}

/**
 * The sections of a long page as a row of anchors that sticks under the app header; the one
 * in view is highlighted. Sections need `scroll-margin-top` so a jump doesn't hide their
 * heading under the bar (see `.section` usage on the object page).
 */
export const SectionNav: React.FC<SectionNavProps> = ({ items, className, ...props }) => {
    const [active, setActive] = useState<string>()
    const ids = items.map(({ id }) => id).join('|')

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) =>
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActive(entry.target.id)
                    }
                }),
            // A section is current while it crosses the band just under the sticky bars
            { rootMargin: '-40% 0px -55% 0px' }
        )

        items.forEach(({ id }) => {
            const section = document.getElementById(id)

            if (section) {
                observer.observe(section)
            }
        })

        // A short last section never reaches the band: at the very bottom it is the current one
        const handleScroll = () => {
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
                setActive(items[items.length - 1]?.id)
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })

        return () => {
            observer.disconnect()
            window.removeEventListener('scroll', handleScroll)
        }
    }, [ids])

    return (
        <nav
            aria-label={props['aria-label']}
            className={cn(styles.sectionNav, className)}
        >
            {items.map(({ id, label }) => (
                <a
                    key={id}
                    href={`#${id}`}
                    className={cn(styles.link, active === id && styles.active)}
                    aria-current={active === id ? 'location' : undefined}
                >
                    {label}
                </a>
            ))}
        </nav>
    )
}
