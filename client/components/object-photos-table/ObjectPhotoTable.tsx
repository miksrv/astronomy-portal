import { ApiModel } from '@/api'
import { formatSecondsToExposure } from '@/functions/helpers'
import { getFilterColor } from '@/tools/colors'
import { createSmallPhotoUrl } from '@/tools/photos'
import { useTranslation } from 'next-i18next'
import Image from 'next/image'
import React from 'react'
import { ColumnProps, Container, Table } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface ObjectPhotoTableProps {
    photosList?: ApiModel.Photo[]
}

export type FlattenedPhoto = {
    photo?: string
    date?: string
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

export const flattenPhotos = (
    photosList?: ApiModel.Photo[]
): FlattenedPhoto[] =>
    photosList?.map(
        (photo) =>
            ({
                photo: createSmallPhotoUrl(photo),
                date: photo.date,
                frames: photo.statistic?.frames || 0,
                exposure: photo.statistic?.exposure || 0,
                lFilterExposure: photo.filters?.L?.exposure || 0,
                rFilterExposure: photo.filters?.R?.exposure || 0,
                gFilterExposure: photo.filters?.G?.exposure || 0,
                bFilterExposure: photo.filters?.B?.exposure || 0,
                hFilterExposure: photo.filters?.H?.exposure || 0,
                oFilterExposure: photo.filters?.O?.exposure || 0,
                sFilterExposure: photo.filters?.S?.exposure || 0
            } as FlattenedPhoto)
    ) || []

const ObjectPhotoTable: React.FC<ObjectPhotoTableProps> = ({ photosList }) => {
    const { t } = useTranslation()

    const tableColumns: ColumnProps<FlattenedPhoto>[] = [
        {
            accessor: 'photo',
            className: styles.cellPhoto,
            formatter: (data) =>
                data ? (
                    <Image
                        src={data as string}
                        width={106}
                        height={24}
                        alt={''}
                    />
                ) : undefined,
            header: t('photo'),
            isSortable: true
        },
        {
            accessor: 'date',
            className: styles.cellCenter,
            formatter: (data) => (data as number) || '',
            header: t('date'),
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

    return (
        <Container className={styles.tableContainer}>
            <Table<FlattenedPhoto>
                className={styles.photosListTable}
                columns={tableColumns}
                verticalBorder={true}
                data={flattenPhotos(photosList)}
                defaultSort={{ direction: 'asc', key: 'date' }}
            />
        </Container>
    )
}

export default ObjectPhotoTable
