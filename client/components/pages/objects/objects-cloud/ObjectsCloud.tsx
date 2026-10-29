import React from 'react'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { formatObjectName } from '@/utils/strings'

import styles from './styles.module.sass'

interface ObjectsCloudProps {
    selectedObject?: string
    objectNamesList?: string[]
}

export const ObjectsCloud: React.FC<ObjectsCloudProps> = ({ selectedObject, objectNamesList }) => {
    const { t } = useTranslation()

    return (
        <nav
            className={styles.objectsCloud}
            aria-label={t('menu.objects', 'Объекты')}
        >
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
        </nav>
    )
}
