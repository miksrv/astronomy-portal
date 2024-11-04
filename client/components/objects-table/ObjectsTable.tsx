import { ApiModel, ApiType } from '@/api'
import { formatSecondsToExposure } from '@/functions/helpers'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ColumnProps, Container, Table, TableProps } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface ObjectsTableProps {
    objectsList?: ApiModel.Object[]
}

export type FlattenedObject = {
    name: string
    title: string
    categories?: ApiModel.Category[]
    updated?: string
    frames?: number
    exposure?: number
    lFilterExposure?: number
    rFilterExposure?: number
    gFilterExposure?: number
    bFilterExposure?: number
    hFilterExposure?: number
    oFilterExposure?: number
    sFilterExposure?: number
}

export const flattenObjects = (
    objectsList?: ApiModel.Object[]
): FlattenedObject[] =>
    objectsList?.map(
        (obj) =>
            ({
                bFilterExposure: obj.filters?.B?.exposure || 0,
                categories: obj.categories,
                exposure: obj.statistic?.exposure || 0,
                frames: obj.statistic?.frames || 0,
                gFilterExposure: obj.filters?.G?.exposure || 0,
                hFilterExposure: obj.filters?.H?.exposure || 0,
                lFilterExposure: obj.filters?.L?.exposure || 0,
                name: obj.name,
                oFilterExposure: obj.filters?.O?.exposure || 0,
                rFilterExposure: obj.filters?.R?.exposure || 0,
                sFilterExposure: obj.filters?.S?.exposure || 0,
                title: obj.title,
                updated: obj.updated?.date
            } as FlattenedObject)
    ) || []

export const colors = {
    air: ['#8dbdef', '#9bc4f5'], // Air
    blue: ['#2c7eec', '#468de8'], // Blue
    brown: ['#795548', '#8d6e63'], // Brown
    cyan: ['#00bcd4', '#4dd0e1'], // Cyan
    green: ['#4caf50', '#66bb6a'], // Green
    grey: ['#607d8b', '#78909c'], // Grey
    lightblue: ['#2196f3', '#42a5f5'], // Light Blue
    lime: ['#cddc39', '#d4e157'], // Lime
    magenta: ['#c2185b', '#db3c7f'], // Magenta
    navy: ['#283593', '#3f51b5'], // Navy
    olive: ['#8c9e35', '#a3b236'], // Olive
    orange: ['#ff5722', '#ff7043'], // Orange
    pink: ['#e91e63', '#ff5b85'], // Pink
    purple: ['#7d2ae8', '#9146ff'], // Purple
    red: ['#e53935', '#f25755'], // Red
    teal: ['#009688', '#26a69a'], // Teal
    violet: ['#8c1fc9', '#a23de3'], // Violet
    yellow: ['#ffeb3b', '#fff176'] // Yellow
}

const ObjectsTable: React.FC<ObjectsTableProps> = ({ objectsList }) => {
    const { t } = useTranslation()

    const [tableHeight, setTableHeight] = useState<number | null>()

    const tableColumns: ColumnProps<FlattenedObject>[] = [
        {
            accessor: 'name',
            formatter: (data, row, i) => (
                <Link
                    href={`/objects/${data}`}
                    title={`${row[i].title}`}
                    className={styles.objectLink}
                >
                    {(data as string).replace('_', ' ')}
                </Link>
            ),
            header: t('object'),
            isSortable: true
        },
        {
            accessor: 'frames',
            className: styles.cellCenter,
            formatter: (data) => (data as number) || '',
            header: t('frames'),
            isSortable: true
        },
        {
            accessor: 'exposure',
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: t('exposure'),
            isSortable: true
        },
        {
            accessor: 'lFilterExposure',
            background: (data) => (data ? colors['grey'][0] : ''),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'L',
            isSortable: true
        },
        {
            accessor: 'rFilterExposure',
            background: (data) => (data ? colors['red'][0] : ''),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'R',
            isSortable: true
        },
        {
            accessor: 'gFilterExposure',
            background: (data) => (data ? colors['green'][0] : ''),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'G',
            isSortable: true
        },
        {
            accessor: 'bFilterExposure',
            background: (data) => (data ? colors['blue'][0] : ''),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'B',
            isSortable: true
        },
        {
            accessor: 'hFilterExposure',
            background: (data) => (data ? colors['teal'][0] : ''),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'H',
            isSortable: true
        },
        {
            accessor: 'oFilterExposure',
            background: (data) => (data ? colors['cyan'][0] : ''),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'O',
            isSortable: true
        },
        {
            accessor: 'sFilterExposure',
            background: (data) => (data ? colors['magenta'][0] : ''),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'S',
            isSortable: true
        }
    ]

    useEffect(() => {
        const calculateTableHeight = () => {
            if (document.documentElement.clientHeight) {
                const containerHeight = document.documentElement.clientHeight
                const titleHeight = 160 // #TODO
                const calculatedHeight = containerHeight - titleHeight
                setTableHeight(calculatedHeight)
            }
        }

        calculateTableHeight()

        window.addEventListener('resize', calculateTableHeight)

        return () => {
            window.removeEventListener('resize', calculateTableHeight)
        }
    }, [])

    return (
        <Container className={styles.tableContainer}>
            <Table<FlattenedObject>
                className={styles.objectsListTable}
                stickyHeader={true}
                columns={tableColumns}
                height={tableHeight}
                data={flattenObjects(objectsList)}
                defaultSort={{ direction: 'asc', key: 'name' }}
            />
        </Container>
    )
}

export default ObjectsTable
