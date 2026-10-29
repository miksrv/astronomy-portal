import React from 'react'
import { Container, Table, TableColumnProps } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

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

    const columns: Array<TableColumnProps<TelescopeEvent>> = [
        {
            accessor: 'telescope_date',
            header: t('components.common.object-photos-table.date', 'Дата'),
            formatter: (date) => (
                <span className={styles.dateCell}>
                    <MoonPhaseIcon date={date as string} />
                    {formatDate(date as string, 'D MMMM YYYY')}
                </span>
            ),
            isSortable: true
        },
        {
            accessor: 'frames_count',
            header: t('components.pages.index.main-sections.frames', 'Кадров'),
            formatter: (frames) => <span className={styles.num}>{frames as number}</span>,
            isSortable: true
        },
        {
            accessor: 'total_exposure',
            header: t('components.common.object-photos-table.exposure', 'Выдержка'),
            formatter: (exposure) => (
                <span className={styles.num}>{getTimeFromSec((exposure as number) || 0, true)}</span>
            ),
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
            <Table<TelescopeEvent>
                size={'small'}
                columns={columns}
                loading={loading}
                data={eventsTelescope || []}
                maxHeight={260}
                stickyHeader={true}
            />
        </Container>
    )
}
