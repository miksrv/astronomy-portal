import { TFilters } from '@/api/types'
import { declOfNum } from '@/functions/helpers'
import classNames from 'classnames'
import React from 'react'

import styles from './styles.module.sass'

type TFilterListProps = {
    filters?: TFilters
}

const FilterList: React.FC<TFilterListProps> = ({ filters }) => (
    <ul className={styles.filterList}>
        {Object.entries(filters || []).map(([name, filter]) => (
            <li key={name}>
                <span className={classNames(styles.filterItem, styles[name])}>
                    {name}
                </span>
                {Math.round(filter.exposure / 60)}{' '}
                {declOfNum(Math.round(filter.exposure / 60), [
                    'минута',
                    'минуты',
                    'минут'
                ])}{' '}
                ({filter.frames}{' '}
                {declOfNum(filter.frames, ['кадр', 'кадра', 'кадров'])})
            </li>
        ))}
    </ul>
)

export default FilterList
