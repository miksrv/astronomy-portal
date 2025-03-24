import React from 'react'
import Link from 'next/link'
import { Container } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

import { formatObjectName } from '@/tools/strings'

type PhotoObject = {
    object?: string
    photoId?: string
}

interface PhotoCloudProps {
    selectedObject?: string
    photosList?: PhotoObject[]
}

const PhotoCloud: React.FC<PhotoCloudProps> = ({ selectedObject, photosList }) => (
    <Container className={styles.photosCloud}>
        <ul className={styles.objectsList}>
            {photosList?.map((item) => (
                <li key={item.object}>
                    <Link
                        href={`/photos/${item.photoId}`}
                        className={selectedObject === item.object ? styles.active : undefined}
                        title={''}
                    >
                        {formatObjectName(item?.object)}
                    </Link>
                    <span className={styles.divider}>{'•'}</span>
                </li>
            ))}
        </ul>
    </Container>
)

export default PhotoCloud
