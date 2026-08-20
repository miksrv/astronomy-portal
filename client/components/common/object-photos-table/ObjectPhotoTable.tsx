import React, { useMemo } from 'react'
import { Container, ContainerProps, Table, TableColumnProps } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { getFilterColor } from '@/utils/colors'
import { formatDate } from '@/utils/dates'
import { formatSecondsToExposure } from '@/utils/helpers'
import { createPhotoTitle } from '@/utils/photos'

import { FlattenedPhoto, flattenPhotos } from './utils'

import styles from './styles.module.sass'

interface ObjectPhotoTableProps extends ContainerProps {
    photosList?: ApiModel.Photo[]
    currentPhotoId?: string
}

export const ObjectPhotoTable: React.FC<ObjectPhotoTableProps> = ({ photosList, currentPhotoId, ...props }) => {
    const { t } = useTranslation()

    const flattenedPhotos = useMemo(() => flattenPhotos(photosList), [photosList])

    const tableColumns: Array<TableColumnProps<FlattenedPhoto>> = useMemo(
        () => [
            {
                accessor: 'photo',
                className: styles.cellPhoto,
                formatter: (data, row, i) => {
                    const item = row[i]

                    return (
                        data &&
                        item && (
                            <Link
                                href={`/photos/${item.id}`}
                                title={createPhotoTitle(item as ApiModel.Photo, t)}
                                className={currentPhotoId === item.id ? styles.active : ''}
                            >
                                <Image
                                    src={data as string}
                                    width={106}
                                    height={24}
                                    alt={''}
                                />
                            </Link>
                        )
                    )
                },
                header: t('components.common.object-photos-table.photo', 'Фотография'),
                isSortable: true
            },
            {
                accessor: 'date',
                className: styles.cellCenter,
                formatter: (data) => formatDate(data as string, 'DD MMM YYYY'),
                header: t('components.common.object-photos-table.date', 'Дата'),
                isSortable: true
            },
            {
                accessor: 'frames',
                className: styles.cellCenter,
                formatter: (data) => (data as number) || '',
                header: t('components.common.object-photos-table.frames', 'Кадры'),
                isSortable: true
            },
            {
                accessor: 'exposure',
                className: styles.cellCenter,
                formatter: (data) => (data ? formatSecondsToExposure(data as number) : ''),
                header: t('components.common.object-photos-table.exposure', 'Выдержка'),
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
                size={'small'}
                className={styles.photosListTable}
                columns={tableColumns}
                verticalBorder={true}
                data={flattenedPhotos}
                defaultSort={{ direction: 'desc', key: 'date' }}
            />
        </Container>
    )
}
