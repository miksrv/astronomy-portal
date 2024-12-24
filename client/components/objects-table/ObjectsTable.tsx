import { ApiModel } from '@/api'
import { formatSecondsToExposure } from '@/functions/helpers'
import { getFilterColor } from '@/tools/colors'
import { createSmallPhotoUrl } from '@/tools/photos'
import { formatObjectName } from '@/tools/strings'
import { useTranslation } from 'next-i18next'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { ColumnProps, Container, Table } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface ObjectsTableProps {
    objectsList?: ApiModel.Object[]
    photosList?: ApiModel.Photo[]
}

export type FlattenedObject = {
    name: string
    title: string
    photo?: string
    photoId?: string
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
    objectsList?: ApiModel.Object[],
    photosList?: ApiModel.Photo[]
): FlattenedObject[] =>
    objectsList?.map((obj) => {
        const photos = photosList
            ?.filter((photo) => photo.objects?.includes(obj.name))
            ?.sort((a, b) =>
                a.date && b.date
                    ? new Date(b?.date).getTime() - new Date(a?.date).getTime()
                    : 0
            )

        return {
            name: obj.name,
            title: obj.title,
            photo: createSmallPhotoUrl(photos?.[0]),
            photoId: photos?.[0]?.id,
            categories: obj.categories,
            updated: obj.updated?.date,
            frames: obj.statistic?.frames || 0,
            exposure: obj.statistic?.exposure || 0,
            lFilterExposure: obj.filters?.L?.exposure || 0,
            rFilterExposure: obj.filters?.R?.exposure || 0,
            gFilterExposure: obj.filters?.G?.exposure || 0,
            bFilterExposure: obj.filters?.B?.exposure || 0,
            hFilterExposure: obj.filters?.H?.exposure || 0,
            oFilterExposure: obj.filters?.O?.exposure || 0,
            sFilterExposure: obj.filters?.S?.exposure || 0
        } as FlattenedObject
    }) || []

const ObjectsTable: React.FC<ObjectsTableProps> = ({
    objectsList,
    photosList
}) => {
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
                    {formatObjectName(data as string)}
                </Link>
            ),
            header: t('object'),
            isSortable: true
        },
        {
            accessor: 'photo',
            className: styles.cellPhoto,
            formatter: (data, row, i) =>
                data ? (
                    <Link
                        key={row[i].photoId}
                        href={`/photos/${row[i].photoId}`}
                        title={'Фотография объекта'}
                    >
                        <Image
                            src={data as string}
                            width={106}
                            height={24}
                            alt={''}
                        />
                    </Link>
                ) : undefined,
            header: t('photo'),
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
            background: (data) => (data ? getFilterColor('L') : undefined),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'L',
            isSortable: true
        },
        {
            accessor: 'rFilterExposure',
            background: (data) => (data ? getFilterColor('R') : undefined),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'R',
            isSortable: true
        },
        {
            accessor: 'gFilterExposure',
            background: (data) => (data ? getFilterColor('G') : undefined),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'G',
            isSortable: true
        },
        {
            accessor: 'bFilterExposure',
            background: (data) => (data ? getFilterColor('B') : undefined),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'B',
            isSortable: true
        },
        {
            accessor: 'hFilterExposure',
            background: (data) => (data ? getFilterColor('H') : undefined),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'H',
            isSortable: true
        },
        {
            accessor: 'oFilterExposure',
            background: (data) => (data ? getFilterColor('O') : undefined),
            className: styles.cellCenter,
            formatter: (data) =>
                data ? formatSecondsToExposure(data as number) : '',
            header: 'O',
            isSortable: true
        },
        {
            accessor: 'sFilterExposure',
            background: (data) => (data ? getFilterColor('S') : undefined),
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
                const titleHeight = 110 // #TODO
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
                columns={tableColumns}
                height={tableHeight}
                stickyHeader={true}
                verticalBorder={true}
                data={flattenObjects(objectsList, photosList)}
                defaultSort={{ direction: 'asc', key: 'name' }}
            />
        </Container>
    )
}

export default ObjectsTable
