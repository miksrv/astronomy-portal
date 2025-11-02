import React from 'react'
import { ColumnProps, Container, Skeleton, Table } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { MoonPhaseIcon } from '@/components/common'
import { formatDate } from '@/utils/dates'
import { getTimeFromSec } from '@/utils/helpers'

import styles from './styles.module.sass'

interface TelescopeEvent {
    telescope_date: string
    frames_count: number
    total_exposure: number
    catalog_items: string[]
}

interface TelescopeWorkdaysProps {
    loading?: boolean
    eventsTelescope?: TelescopeEvent[]
}

export const TelescopeWorkdays: React.FC<TelescopeWorkdaysProps> = ({ loading, eventsTelescope }) => {
    const { t } = useTranslation()

    const columns: Array<ColumnProps<TelescopeEvent>> = [
        {
            accessor: 'telescope_date',
            header: t('components.common.object-photos-table.date', 'Дата'),
            formatter: (date) => (
                <span className={styles.date}>
                    <MoonPhaseIcon date={date as string} />
                    {formatDate(date as string, 'D MMMM YYYY')}
                </span>
            ),
            isSortable: true,
            className: styles.date
        },
        {
            accessor: 'frames_count',
            header: t('components.pages.index.main-sections.frames', 'Кадров'),
            formatter: (frames) => frames,
            isSortable: true
        },
        {
            accessor: 'total_exposure',
            header: t('components.common.object-photos-table.exposure', 'Выдержка'),
            formatter: (exposure) => getTimeFromSec((exposure as number) || 0, true),
            isSortable: true
        },
        {
            accessor: 'catalog_items',
            header: t('pages.about.observatory-work-1.objects', 'Объекты'),
            formatter: (items) =>
                (items as string[]).map((object) => (
                    <Link
                        key={object}
                        className={styles.link}
                        href={`/objects/${object}`}
                        title={`${object.replace(/_/g, ' ')} - ${t('pages.about.observatory-work-1.objects', 'Объекты')}`}
                    >
                        {object.replace(/_/g, ' ')}
                    </Link>
                )),
            isSortable: false
        }
    ]

    return (
        <Container className={styles.tableContainer}>
            {loading && (
                <div className={styles.loader}>
                    <Skeleton />
                </div>
            )}

            <Table<TelescopeEvent>
                columns={columns}
                data={eventsTelescope || []}
                className={styles.objectsListTable}
                stickyHeader={true}
                verticalBorder={true}
            />
        </Container>
    )
}
