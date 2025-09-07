import React from 'react'

import { useTranslation } from 'next-i18next'

import { ApiModel } from '@/api'
import { getFilterColor } from '@/utils/colors'

import styles from './styles.module.sass'

interface PhotoFilterListProps {
    filters?: ApiModel.Filters
}

export const PhotoFilterList: React.FC<PhotoFilterListProps> = ({ filters }) => {
    const { t } = useTranslation()

    const filterList = Object.entries(filters || [])

    return (
        !!filterList?.length && (
            <ul className={styles.filterList}>
                {filterList.map(([name, statistic]) => (
                    <li key={name}>
                        <span
                            className={styles.filterItem}
                            style={{
                                backgroundColor: getFilterColor(name as ApiModel.FilterTypes)
                            }}
                        >
                            {name}
                        </span>
                        {t('common.minutes', '{{count}} минут', {
                            count: statistic.exposure ? Math.round(statistic.exposure / 60) : 0
                        })}{' '}
                        {`(${t('common.frames', '{{count}} кадров', {
                            count: statistic.frames
                        })})`}
                    </li>
                ))}
            </ul>
        )
    )
}
