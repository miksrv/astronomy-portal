import React from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import Image, { StaticImageData } from 'next/image'
import Link from 'next/link'

import styles from './styles.module.sass'

export interface NumberedItem {
    title: string
    text?: React.ReactNode
    /** The whole item is one link */
    href?: string
    image?: StaticImageData | string
    imageAlt?: string
}

interface NumberedListProps {
    items: NumberedItem[]
    /** Columns on wide screens (default: as many as items, at most 4) */
    columns?: 2 | 3 | 4
    /** The ordinal of the first item (a list continued elsewhere) */
    start?: number
    /** The title on the ordinal's line (between the number and the arrow), the text larger under
     * it: for links whose short title says it all (the guide pages) */
    inlineTitle?: boolean
    className?: string
}

const ordinal = (n: number) => String(n).padStart(2, '0')

/**
 * Numbered items of a landing section: 01, 02, 03 on a hairline, a title and a line of text,
 * optionally a photo over them or a link over the whole item (DESIGN.md → Landing pages)
 */
export const NumberedList: React.FC<NumberedListProps> = ({ items, columns, start = 1, inlineTitle, className }) => (
    <ol
        className={cn(styles.list, inlineTitle && styles.inline, className)}
        style={{ '--columns': columns ?? Math.min(items.length, 4) } as React.CSSProperties}
        start={start}
    >
        {items.map((item, index) => {
            const body = (
                <>
                    {item.image && (
                        <div className={styles.imageWrapper}>
                            <Image
                                className={styles.image}
                                src={item.image}
                                alt={item.imageAlt ?? ''}
                                placeholder={typeof item.image === 'string' ? 'empty' : 'blur'}
                                sizes={'(max-width: 768px) 100vw, 25vw'}
                                fill
                            />
                        </div>
                    )}

                    <div className={styles.indexRow}>
                        <span
                            className={styles.index}
                            aria-hidden={'true'}
                        >
                            {ordinal(start + index)}
                        </span>
                        {inlineTitle && <h3 className={styles.title}>{item.title}</h3>}
                        {item.href && (
                            <Icon
                                name={'KeyboardRight'}
                                className={styles.arrow}
                            />
                        )}
                    </div>

                    {!inlineTitle && <h3 className={styles.title}>{item.title}</h3>}
                    {item.text && <p className={styles.text}>{item.text}</p>}
                </>
            )

            return (
                <li
                    key={item.title}
                    className={styles.item}
                >
                    {item.href ? (
                        <Link
                            href={item.href}
                            className={styles.link}
                        >
                            {body}
                        </Link>
                    ) : (
                        body
                    )}
                </li>
            )
        })}
    </ol>
)
