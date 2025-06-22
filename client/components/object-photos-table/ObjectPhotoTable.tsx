import React, { useMemo } from 'react'
import { ColumnProps, Container, ContainerProps, Table } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { ApiModel } from '@/api'
import { getFilterColor } from '@/tools/colors'
import { formatDate } from '@/tools/dates'
import { formatSecondsToExposure } from '@/tools/helpers'
import { createPhotoTitle, createSmallPhotoUrl } from '@/tools/photos'

import styles from './styles.module.sass'

interface ObjectPhotoTableProps extends ContainerProps {
    photosList?: ApiModel.Photo[]
    currentPhotoId?: string
}

export type FlattenedPhoto = {
    id?: string
    photo?: string
    objects?: string[]
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
    nFilterExposure?: number
}

const ObjectPhotoTable: React.FC<ObjectPhotoTableProps> = ({ photosList, currentPhotoId, ...props }) => {
    const { t } = useTranslation()

    const flattenedPhotos = useMemo(() => flattenPhotos(photosList), [photosList])

    const tableColumns: Array<ColumnProps<FlattenedPhoto>> = useMemo(
        () => [
            {
                accessor: 'photo',
                className: styles.cellPhoto,
                formatter: (data, row, i) =>
                    data ? (
                        <Link
                            href={`/photos/${row[i].id}`}
                            title={createPhotoTitle(row[i] as ApiModel.Photo, t)}
                            className={currentPhotoId === row[i].id ? styles.active : ''}
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
                accessor: 'date',
                className: styles.cellCenter,
                formatter: (data) => formatDate(data as string, 'DD MMM YYYY'),
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
                formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
                header: t('exposure'),
                isSortable: true
            },
            {
                accessor: 'lFilterExposure',
                hidden: !flattenedPhotos?.filter(({ lFilterExposure }) => !!lFilterExposure)?.length,
                background: (data) => (data ? getFilterColor('L') : undefined),
                className: styles.cellCenter,
                formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
                header: 'L',
                isSortable: true
            },
            {
                accessor: 'rFilterExposure',
                hidden: !flattenedPhotos?.filter(({ rFilterExposure }) => !!rFilterExposure)?.length,
                background: (data) => (data ? getFilterColor('R') : undefined),
                className: styles.cellCenter,
                formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
                header: 'R',
                isSortable: true
            },
            {
                accessor: 'gFilterExposure',
                hidden: !flattenedPhotos?.filter(({ gFilterExposure }) => !!gFilterExposure)?.length,
                background: (data) => (data ? getFilterColor('G') : undefined),
                className: styles.cellCenter,
                formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
                header: 'G',
                isSortable: true
            },
            {
                accessor: 'bFilterExposure',
                hidden: !flattenedPhotos?.filter(({ bFilterExposure }) => !!bFilterExposure)?.length,
                background: (data) => (data ? getFilterColor('B') : undefined),
                className: styles.cellCenter,
                formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
                header: 'B',
                isSortable: true
            },
            {
                accessor: 'hFilterExposure',
                hidden: !flattenedPhotos?.filter(({ hFilterExposure }) => !!hFilterExposure)?.length,
                background: (data) => (data ? getFilterColor('H') : undefined),
                className: styles.cellCenter,
                formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
                header: 'H',
                isSortable: true
            },
            {
                accessor: 'oFilterExposure',
                hidden: !flattenedPhotos?.filter(({ oFilterExposure }) => !!oFilterExposure)?.length,
                background: (data) => (data ? getFilterColor('O') : undefined),
                className: styles.cellCenter,
                formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
                header: 'O',
                isSortable: true
            },
            {
                accessor: 'sFilterExposure',
                hidden: !flattenedPhotos?.filter(({ sFilterExposure }) => !!sFilterExposure)?.length,
                background: (data) => (data ? getFilterColor('S') : undefined),
                className: styles.cellCenter,
                formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
                header: 'S',
                isSortable: true
            },
            {
                accessor: 'nFilterExposure',
                hidden: !flattenedPhotos?.filter(({ nFilterExposure }) => !!nFilterExposure)?.length,
                background: (data) => (data ? getFilterColor('N') : undefined),
                className: styles.cellCenter,
                formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
                header: 'N',
                isSortable: true
            }
        ],
        [flattenedPhotos, currentPhotoId, t]
    )

    return (
        <Container
            className={styles.tableContainer}
            {...props}
        >
            <Table<FlattenedPhoto>
                className={styles.photosListTable}
                columns={tableColumns}
                verticalBorder={true}
                data={flattenedPhotos}
                defaultSort={{ direction: 'desc', key: 'date' }}
            />
        </Container>
    )
}

export const flattenPhotos = (photosList?: ApiModel.Photo[]): FlattenedPhoto[] =>
    photosList?.map(
        (photo) =>
            ({
                id: photo.id,
                photo: createSmallPhotoUrl(photo),
                objects: photo.objects,
                date: photo.date,
                frames: photo.statistic?.frames || 0,
                exposure: photo.statistic?.exposure || 0,
                lFilterExposure: photo.filters?.L?.exposure || 0,
                rFilterExposure: photo.filters?.R?.exposure || 0,
                gFilterExposure: photo.filters?.G?.exposure || 0,
                bFilterExposure: photo.filters?.B?.exposure || 0,
                hFilterExposure: photo.filters?.H?.exposure || 0,
                oFilterExposure: photo.filters?.O?.exposure || 0,
                sFilterExposure: photo.filters?.S?.exposure || 0,
                nFilterExposure: photo.filters?.N?.exposure || 0
            }) as FlattenedPhoto
    ) || []

export default ObjectPhotoTable
