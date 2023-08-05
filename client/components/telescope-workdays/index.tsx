import { TStatisticTelescope } from '@/api/types'
import { getTimeFromSec } from '@/functions/helpers'
import classNames from 'classnames'
import moment from 'moment/moment'
import Link from 'next/link'
import React from 'react'
import { Dimmer, Loader, Table } from 'semantic-ui-react'

import MoonPhase from '@/components/moon-phase'

import styles from './styles.module.sass'

type TTelescopeWorkdaysProps = {
    loading?: boolean
    eventsTelescope?: TStatisticTelescope[]
}

const TelescopeWorkdays: React.FC<TTelescopeWorkdaysProps> = ({
    loading,
    eventsTelescope
}) => {
    return (
        <div className={classNames(styles.section, 'box', 'table')}>
            <div className={styles.tableContainer}>
                {loading && (
                    <div className={classNames(styles.loader)}>
                        <Dimmer active>
                            <Loader />
                        </Dimmer>
                    </div>
                )}
                <Table
                    unstackable
                    sortable
                    celled
                    inverted
                    selectable
                    compact
                >
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell content={'Дата съемки'} />
                            <Table.HeaderCell content={'Кадров'} />
                            <Table.HeaderCell content={'Выдержка'} />
                            <Table.HeaderCell content={'Объекты'} />
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {eventsTelescope?.map((day) => (
                            <Table.Row key={day.telescope_date}>
                                <Table.Cell
                                    singleLine={true}
                                    className={styles.date}
                                >
                                    <MoonPhase
                                        date={moment(day.telescope_date)}
                                    />
                                    {moment
                                        .utc(day.telescope_date)
                                        .utcOffset('GMT+05:00')
                                        .format('D MMMM Y')}
                                </Table.Cell>
                                <Table.Cell
                                    singleLine={true}
                                    content={day.frames_count}
                                />
                                <Table.Cell
                                    singleLine={true}
                                    content={getTimeFromSec(
                                        day.total_exposure || 0,
                                        true
                                    )}
                                />
                                <Table.Cell singleLine={true}>
                                    {day.catalog_items.map((object) => (
                                        <Link
                                            key={object}
                                            className={styles.link}
                                            href={`/objects/${object}`}
                                            title={`${object.replace(
                                                /_/g,
                                                ' '
                                            )} - Перейти к астрономическому объекту`}
                                        >
                                            {object.replace(/_/g, ' ')}
                                        </Link>
                                    ))}
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            </div>
        </div>
    )
}

export default TelescopeWorkdays
