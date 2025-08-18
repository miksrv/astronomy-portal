import React from 'react'
import Markdown from 'react-markdown'
import { Container } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface ObjectDescriptionProps {
    text?: string
}

export const ObjectDescription: React.FC<ObjectDescriptionProps> = ({ text }) => (
    <Container className={styles.objectDescription}>
        <Markdown>{text}</Markdown>
    </Container>
)
