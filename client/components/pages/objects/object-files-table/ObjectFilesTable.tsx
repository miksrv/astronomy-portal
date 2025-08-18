import React, { useMemo } from 'react'
import { ColumnProps, Container, Table } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next'

import { ApiModel } from '@/api'
import { MoonPhaseIcon } from '@/components/common'
import { getFilterColor } from '@/utils/colors'
import { formatDate } from '@/utils/dates'
import { getMoonIllumination } from '@/utils/moon'

import styles from './styles.module.sass'

export type FlattenedFile = Omit<ApiModel.File, 'date'> & {
    date?: string
    moon?: number
}

interface ObjectFilesTableProps {
    filesList?: ApiModel.File[]
    loading?: boolean
}

export const ObjectFilesTable: React.FC<ObjectFilesTableProps> = ({ filesList, loading }) => {
    const { t } = useTranslation()

    const flattenedFilesList: FlattenedFile[] = useMemo(
        () =>
            filesList?.map(
                (file) =>
                    ({
                        ...file,
                        date: file.date?.date,
                        moon: file.date?.date ? getMoonIllumination(new Date(file.date?.date)) : undefined
                    }) as FlattenedFile
            ) || [],
        [filesList]
    )

    const tableColumns: Array<ColumnProps<FlattenedFile>> = [
        {
            accessor: 'date',
            formatter: (date) => (date ? formatDate(date as string) : ''),
            header: t('date'),
            isSortable: true
        },
        {
            accessor: 'moon',
            formatter: (data, item, i) => (
                <>
                    <MoonPhaseIcon date={item?.[i]?.date || ''} />
                    {Math.round(data as number)}
                    {'%'}
                </>
            ),
            header: t('moon-phase'),
            isSortable: true
        },
        {
            accessor: 'exposure',
            className: styles.cellCenter,
            formatter: (data) => (data as number) || '',
            header: t('exposure'),
            isSortable: true
        },
        {
            accessor: 'ccdTemp',
            className: styles.cellCenter,
            formatter: (data) => `${data}°C`,
            header: t('ccd-temperature'),
            isSortable: true
        },
        {
            accessor: 'gain',
            className: styles.cellCenter,
            header: t('gain'),
            isSortable: true
        },
        {
            accessor: 'offset',
            className: styles.cellCenter,
            header: t('offset'),
            isSortable: true
        },
        {
            accessor: 'filter',
            background: (data) => (data ? getFilterColor(data as ApiModel.FilterTypes) : undefined),
            className: styles.cellCenter,
            header: t('filter'),
            isSortable: true
        }
    ]

    return (
        <Container className={styles.tableContainer}>
            <Table<FlattenedFile>
                className={styles.filesListTable}
                columns={tableColumns}
                verticalBorder={true}
                stickyHeader={true}
                loading={loading}
                data={flattenedFilesList}
                noDataCaption={t('no-fits-files')}
                defaultSort={{ direction: 'desc', key: 'date' }}
                maxHeight={280}
            />
        </Container>
    )
}
