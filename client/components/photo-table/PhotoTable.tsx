import { ApiModel } from '@/api'
import classNames from 'classnames'
import React, { useMemo } from 'react'
import { Table } from 'semantic-ui-react'

import RenderTableRow from './RenderTableRow'
import styles from './styles.module.sass'

interface PhotoTableProps {
    photos?: ApiModel.Photo[]
}

const headerFields: string[] = [
    'Фото',
    'Дата',
    'Кадров',
    'Выдержка',
    ...ApiModel.Filter.List
]

const PhotoTable: React.FC<PhotoTableProps> = ({ photos }) => {
    const hideTableRows = useMemo(() => {
        let result: any[] = []

        ApiModel.Filter.List.forEach((filterName) => {
            if (
                !photos?.filter(
                    ({ filters }) =>
                        filters?.[filterName as keyof ApiModel.Filter.ListItems]
                            ?.frames
                )?.length
            ) {
                result.push(filterName)
            }
        })

        return result
    }, [photos])

    return (
        <div className={classNames(styles.section, 'table', 'box')}>
            <Table
                unstackable
                singleLine
                sortable
                celled
                inverted
                selectable
                compact
                className={styles.photoTable}
            >
                <Table.Header>
                    <Table.Row>
                        {headerFields
                            .filter((item) => !hideTableRows.includes(item))
                            .map((item) => (
                                <Table.HeaderCell
                                    key={item}
                                    className={'tableHeaderSticky'}
                                    content={item}
                                />
                            ))}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {photos?.length ? (
                        photos.map((photo) => (
                            <RenderTableRow
                                key={photo.id}
                                photo={photo}
                                hideRows={hideTableRows}
                            />
                        ))
                    ) : (
                        <Table.Row>
                            <Table.Cell
                                textAlign={'center'}
                                colSpan={headerFields.length}
                                content={'Астрофотографий объекта не найдено'}
                            />
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
        </div>
    )
}

export default PhotoTable
