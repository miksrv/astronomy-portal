import React, { useEffect, useId, useRef, useState } from 'react'
import { Button, cn, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

interface ShowMoreProps {
    content?: React.ReactNode
    /** False renders the text whole, with no clamp and no toggle */
    collapsible?: boolean
}

/**
 * Long text clamped with a fade and a "Читать полностью ⌄" link-styled toggle under it,
 * flush left with the text. The toggle is rendered until the text is measured (the server
 * HTML and the first client render agree), then dropped when the text fits.
 */
export const ShowMore: React.FC<ShowMoreProps> = ({ content, collapsible = true }) => {
    const { t } = useTranslation()
    const contentId = useId()
    const contentRef = useRef<HTMLDivElement>(null)

    const [isExpanded, setIsExpanded] = useState(false)
    const [overflows, setOverflows] = useState(true)
    // The full height of the text, so expanding animates to it instead of a guessed cap
    const [fullHeight, setFullHeight] = useState<number>()

    useEffect(() => {
        const element = contentRef.current

        if (!element || !collapsible) {
            return
        }

        const measure = () => {
            setFullHeight(element.scrollHeight)
            setOverflows(element.scrollHeight > element.clientHeight || isExpanded)
        }

        measure()

        const observer = new ResizeObserver(measure)
        observer.observe(element)

        return () => observer.disconnect()
    }, [content, isExpanded, collapsible])

    if (!collapsible) {
        return <div>{content}</div>
    }

    return (
        <div className={cn(styles.showMore, isExpanded && styles.expanded, !overflows && styles.fits)}>
            <div
                id={contentId}
                ref={contentRef}
                className={styles.content}
                style={isExpanded && fullHeight ? { maxHeight: fullHeight } : undefined}
            >
                {content}
            </div>
            {overflows && (
                <Button
                    unstyled={true}
                    className={styles.readMore}
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded
                        ? t('components.ui.show-more.collapse', 'Свернуть')
                        : t('components.ui.show-more.read-full', 'Читать полностью')}
                    <Icon name={'KeyboardDown'} />
                </Button>
            )}
        </div>
    )
}
