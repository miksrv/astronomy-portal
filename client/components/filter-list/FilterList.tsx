import React from 'react'

import { useTranslation } from 'next-i18next'

import { ApiModel } from '@/api'
import { getFilterColor } from '@/tools/colors'

import styles from './styles.module.sass'

interface FilterListProps {
    filters?: ApiModel.Filters
}

const FilterList: React.FC<FilterListProps> = ({ filters }) => {
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
                        {t('plurals.minutes', {
                            count: statistic.exposure ? Math.round(statistic.exposure / 60) : 0
                        })}{' '}
                        {`(${t('plurals.frames', {
                            count: statistic.frames
                        })})`}
                    </li>
                ))}
            </ul>
        )
    )
}

export default FilterList
