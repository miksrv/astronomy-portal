import React, { useCallback, useEffect, useState } from 'react'

import { TObjectFilters } from '@/api/types'

import { declOfNum } from '@/functions/helpers'

import styles from './styles.module.sass'

type TFilterListProps = {
    filters: TObjectFilters
}

type TFilterListItem = {
    name: string
    exposure: number
    frames: number
}

const FilterListItem: React.FC<TFilterListItem> = ({
    name,
    exposure,
    frames
}) => {
    const minutes = Math.round(exposure / 60)

    return (
        <li>
            <span className={`filter-${name}`}>{name}</span>
            {minutes} {declOfNum(minutes, ["минута", "минуты", "минут"])} ({frames}{' '}
            {declOfNum(frames, ["кадр", "кадра", "кадров"])})
        </li>
    )
}

const FilterList: React.FC<TFilterListProps> = ({ filters }) => {
    const [filtersList, setFiltersList] = useState<TFilterListItem[]>([])

    const doListFilter = useCallback(() => {
        const tempFiltersList: TFilterListItem[] = []

        Object.entries(filters).forEach(
            ([key, value]) =>
                value.exposure &&
                tempFiltersList.push({
                    exposure: value.exposure,
                    frames: value.frames,
                    name: key
                })
        )

        setFiltersList(tempFiltersList)
    }, [filters])

    useEffect(() => {
        doListFilter()
    }, [filters, doListFilter])

    return (
        <ul className={styles.filterList}>
            {filtersList.map((item) => (
                <FilterListItem
                    key={item.name}
                    name={item.name}
                    exposure={item.exposure}
                    frames={item.frames}
                />
            ))}
        </ul>
    )
}

export default FilterList
