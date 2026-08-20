import React, { useEffect, useState } from 'react'
import { Container, Table, TableColumnProps } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { getFilterColor } from '@/utils/colors'
import { formatSecondsToExposure } from '@/utils/helpers'
import { formatObjectName } from '@/utils/strings'

import { FlattenedObject, flattenObjects } from './utils'

import styles from './styles.module.sass'

interface ObjectsTableProps {
    objectsList?: ApiModel.Object[]
    photosList?: ApiModel.Photo[]
    combinedHeight?: number
}

export const ObjectsTable: React.FC<ObjectsTableProps> = ({ objectsList, photosList, combinedHeight }) => {
    const { t } = useTranslation()

    const [tableHeight, setTableHeight] = useState<number | null>()

    const tableColumns: Array<TableColumnProps<FlattenedObject>> = [
        {
            accessor: 'name',
            formatter: (data, row, i) => (
                <Link
                    href={`/objects/${data as string}`}
                    title={`${row[i]?.title ?? ''}`}
                    className={styles.objectLink}
                >
                    {formatObjectName(data as string)}
                </Link>
            ),
            header: t('components.pages.objects.objects-table.object', 'Объект'),
            isSortable: true
        },
        {
            accessor: 'photo',
            className: styles.cellPhoto,
            formatter: (data, row, i) =>
                data && (
                    <Link
                        key={row[i]?.photoId}
                        href={`/photos/${row[i]?.photoId}`}
                        title={t('components.pages.objects.objects-table.view-photo', 'Просмотр фото')}
                    >
                        <Image
                            src={data as string}
                            width={106}
                            height={24}
                            alt={''}
                        />
                    </Link>
                ),
            header: t('components.pages.objects.objects-table.photo', 'Фото'),
            isSortable: true
        },
        {
            accessor: 'frames',
            className: styles.cellCenter,
            formatter: (data) => (data as number) || '',
            header: t('components.pages.objects.objects-table.frames', 'Кадры'),
            isSortable: true
        },
        {
            accessor: 'exposure',
            className: styles.cellCenter,
            formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
            header: t('components.pages.objects.objects-table.exposure', 'Выдержка'),
            isSortable: true
        },
        {
            accessor: 'lFilterExposure',
            background: (data) => (data ? getFilterColor('L') : undefined),
            className: styles.cellCenter,
            formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
            header: 'L',
            isSortable: true
        },
        {
            accessor: 'rFilterExposure',
            background: (data) => (data ? getFilterColor('R') : undefined),
            className: styles.cellCenter,
            formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
            header: 'R',
            isSortable: true
        },
        {
            accessor: 'gFilterExposure',
            background: (data) => (data ? getFilterColor('G') : undefined),
            className: styles.cellCenter,
            formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
            header: 'G',
            isSortable: true
        },
        {
            accessor: 'bFilterExposure',
            background: (data) => (data ? getFilterColor('B') : undefined),
            className: styles.cellCenter,
            formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
            header: 'B',
            isSortable: true
        },
        {
            accessor: 'hFilterExposure',
            background: (data) => (data ? getFilterColor('H') : undefined),
            className: styles.cellCenter,
            formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
            header: 'H',
            isSortable: true
        },
        {
            accessor: 'oFilterExposure',
            background: (data) => (data ? getFilterColor('O') : undefined),
            className: styles.cellCenter,
            formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
            header: 'O',
            isSortable: true
        },
        {
            accessor: 'sFilterExposure',
            background: (data) => (data ? getFilterColor('S') : undefined),
            className: styles.cellCenter,
            formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
            header: 'S',
            isSortable: true
        }
    ]

    useEffect(() => {
        const calculateTableHeight = () => {
            if (document.documentElement.clientHeight) {
                const containerHeight = document.documentElement.clientHeight
                const minusHeight = combinedHeight || 130
                const calculatedHeight = containerHeight - minusHeight

                setTableHeight(calculatedHeight)
            }
        }

        calculateTableHeight()

        window.addEventListener('resize', calculateTableHeight)

        return () => {
            window.removeEventListener('resize', calculateTableHeight)
        }
    }, [combinedHeight])

    return (
        <Container className={styles.tableContainer}>
            <Table<FlattenedObject>
                className={styles.objectsListTable}
                size={'small'}
                columns={tableColumns}
                maxHeight={tableHeight}
                stickyHeader={true}
                verticalBorder={true}
                data={flattenObjects(objectsList, photosList)}
                defaultSort={{ direction: 'asc', key: 'name' }}
                noDataCaption={t('components.pages.objects.objects-table.no-objects', 'Нет объектов')}
            />
        </Container>
    )
}
