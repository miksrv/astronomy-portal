import React from 'react'
import Markdown from 'react-markdown'

import { ShowMore } from '@/components/ui'

import styles from './styles.module.sass'

interface ObjectDescriptionProps {
    text?: string
}

export const ObjectDescription: React.FC<ObjectDescriptionProps> = ({ text }) => (
    <section className={styles.objectDescription}>
        <ShowMore content={<Markdown>{text}</Markdown>} />
    </section>
)
