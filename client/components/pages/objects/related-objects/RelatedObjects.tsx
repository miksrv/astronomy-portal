import React from 'react'

import Link from 'next/link'

import { formatObjectName } from '@/utils/strings'

import { RelatedObject } from '../types'

import styles from './styles.module.sass'

interface RelatedObjectsProps {
    objects: RelatedObject[]
    'aria-label': string
}

/** Other objects of the same kind, as pill links: where to go next in the catalog */
export const RelatedObjects: React.FC<RelatedObjectsProps> = ({ objects, ...props }) => (
    <nav aria-label={props['aria-label']}>
        <ul className={styles.relatedObjects}>
            {objects.map(({ name, title }) => (
                <li key={name}>
                    <Link
                        href={`/objects/${name}`}
                        title={title}
                    >
                        {formatObjectName(name)}
                    </Link>
                </li>
            ))}
        </ul>
    </nav>
)
