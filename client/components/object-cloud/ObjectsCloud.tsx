import React from 'react'
import Link from 'next/link'
import { Container } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

import { formatObjectName } from '@/tools/strings'

interface ObjectsCloudProps {
    selectedObject?: string
    objectNamesList?: string[]
}

const ObjectsCloud: React.FC<ObjectsCloudProps> = ({ selectedObject, objectNamesList }) => (
    <Container className={styles.objectsCloud}>
        <ul className={styles.objectsList}>
            {objectNamesList?.map((item) => (
                <li key={item}>
                    <Link
                        href={`/objects/${item}`}
                        className={selectedObject === item ? styles.active : undefined}
                        title={''}
                    >
                        {formatObjectName(item)}
                    </Link>
                    <span className={styles.divider}>{'•'}</span>
                </li>
            ))}
        </ul>
    </Container>
)

export default ObjectsCloud
