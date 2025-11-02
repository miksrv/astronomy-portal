import React from 'react'
import { ColumnProps, Container, Table } from 'simple-react-ui-kit'

import Link from 'next/link'

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

const columns: Array<ColumnProps<TelescopeEvent>> = [
    {
        accessor: 'telescope_date',
        header: 'Дата съемки',
        formatter: (date, row) => (
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
        header: 'Кадров',
        formatter: (frames) => frames,
        isSortable: true
    },
    {
        accessor: 'total_exposure',
        header: 'Выдержка',
        formatter: (exposure) => getTimeFromSec((exposure as number) || 0, true),
        isSortable: true
    },
    {
        accessor: 'catalog_items',
        header: 'Объекты',
        formatter: (items) => (
            <>
                {(items as string[]).map((object) => (
                    <Link
                        key={object}
                        className={styles.link}
                        href={`/objects/${object}`}
                        title={`${object.replace(/_/g, ' ')} - Перейти к астрономическому объекту`}
                    >
                        {object.replace(/_/g, ' ')}
                    </Link>
                ))}
            </>
        ),
        isSortable: false
    }
]

export const TelescopeWorkdays: React.FC<TelescopeWorkdaysProps> = ({ loading, eventsTelescope }) => (
    <div className={styles.section + ' box table'}>
        <Container className={styles.tableContainer}>
            {loading && (
                <div
                    className={styles.loader}
                    data-testid={'telescope-workdays-loader'}
                >
                    {/* You can add a custom loader here if needed */}
                    Загрузка...
                </div>
            )}
            <Table<TelescopeEvent>
                columns={columns}
                data={eventsTelescope || []}
                className={styles.objectsListTable}
                stickyHeader={true}
                verticalBorder={true}
                noDataCaption={'Нет данных'}
            />
        </Container>
    </div>
)
