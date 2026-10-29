import React from 'react'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { formatObjectName } from '@/utils/strings'

import styles from './styles.module.sass'

type PhotoObject = {
    object?: string
    photoId?: string
}

interface PhotoCloudProps {
    selectedObject?: string
    photosList?: PhotoObject[]
}

export const PhotoCloud: React.FC<PhotoCloudProps> = ({ selectedObject, photosList }) => {
    const { t } = useTranslation()

    return (
        <nav
            className={styles.photosCloud}
            aria-label={t('menu.astrophoto', 'Астрофото')}
        >
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
        </nav>
    )
}
