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

const HeaderFields: THeaderFields[] = [
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

const PhotoTable: React.FC<TPhotoTableProps> = ({ photos, loader }) => (
    <div className={classNames(styles.section, 'table', 'box')}>
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
                    {HeaderFields.map((item, key) => (
                        <Table.HeaderCell key={key}>
                            {item.name}
                        </Table.HeaderCell>
                    ))}
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {photos?.length ? (
                    photos.map((photo, key) => (
                        <RenderTableRow
                            photo={photo}
                            key={key}
                        />
                    ))
                ) : (
                    <Table.Row>
                        <Table.Cell
                            textAlign={'center'}
                            colSpan={HeaderFields.length}
                            content={'Астрофотографй объекта не найдено'}
                        />
                    </Table.Row>
                )}
            </Table.Body>
        </Table>
    </div>
)

export default PhotoTable
