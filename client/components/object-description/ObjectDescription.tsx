import React from 'react'
import { Container } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface ObjectDescriptionProps {
    text?: string
}

const ObjectDescription: React.FC<ObjectDescriptionProps> = ({ text }) => (
    <Container className={styles.objectDescription}>{text}</Container>
)

export default ObjectDescription
