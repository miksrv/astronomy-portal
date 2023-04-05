import { TPhoto } from '@/api/types'
import classNames from 'classnames'
import React from 'react'
import { Dimmer, Loader, Table } from 'semantic-ui-react'

import RenderTableRow from './RenderTableRow'
import styles from './styles.module.sass'

type TPhotoTableProps = {
    loader?: boolean
    photos?: TPhoto[]
}

type THeaderFields = {
    key: string
    name: string
}

const HEADER_FIELDS: THeaderFields[] = [
    { key: 'photo', name: 'Фото' },
    { key: 'date', name: 'Дата' },
    { key: 'frames', name: 'Кадров' },
    { key: 'exposure', name: 'Выдержка' },
    { key: 'Luminance', name: 'L' },
    { key: 'Red', name: 'R' },
    { key: 'Green', name: 'G' },
    { key: 'Blue', name: 'B' },
    { key: 'Ha', name: 'H' },
    { key: 'OIII', name: 'O' },
    { key: 'SII', name: 'S' }
]

const PhotoTable: React.FC<TPhotoTableProps> = (props) => {
    const { photos, loader } = props

    return (
        <div className={classNames('table', 'box')}>
            <Dimmer active={loader}>
                <Loader />
            </Dimmer>
            <Table
                sortable
                celled
                inverted
                selectable
                compact
                className={styles.photoTable}
            >
                <Table.Header>
                    <Table.Row>
                        {HEADER_FIELDS.map((item, key) => (
                            <Table.HeaderCell key={key}>
                                {item.name}
                            </Table.HeaderCell>
                        ))}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {photos?.map((photo, key) => (
                        <RenderTableRow
                            photo={photo}
                            key={key}
                        />
                    ))}
                </Table.Body>
            </Table>
        </div>
    )
}

export default PhotoTable
