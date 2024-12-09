import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { sliceText } from '@/functions/helpers'
import { createMediumPhotoUrl } from '@/tools/photos'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Container, cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface PhotoGridProps {
    threeColumns?: boolean
    photosList?: ApiModel.Photo[]
    catalog?: ApiModel.Catalog[]
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
    threeColumns,
    photosList,
    catalog
}) => (
    <Container className={styles.photoGrid}>
        {photosList?.map((photo) => (
            <Link
                key={photo.id}
                href={`/photos/${photo.id}`}
                title={'Фотография объекта'}
                className={styles.photoItem}
            >
                <Image
                    src={createMediumPhotoUrl(photo)}
                    className={styles.image}
                    alt={photo.id}
                    fill={true}
                />
                <div className={styles.description}>
                    <h4>M31 Туманность андромеды</h4>
                    <div className={styles.info}>
                        Выдержка: 20 мин, кадров: 30
                    </div>
                </div>
            </Link>
        ))}
    </Container>
)

export default PhotoGrid
