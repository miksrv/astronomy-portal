import { TFilterTypes, TFilters, TPhoto } from '@/api/types'
import classNames from 'classnames'
import React, { useMemo } from 'react'
import { Table } from 'semantic-ui-react'

import RenderTableRow from './RenderTableRow'
import styles from './styles.module.sass'

type TPhotoTableProps = {
    photos?: TPhoto[]
}

const headerFieldsFilters: string[] = [
    TFilterTypes.luminance,
    TFilterTypes.red,
    TFilterTypes.green,
    TFilterTypes.blue,
    TFilterTypes.hydrogen,
    TFilterTypes.oxygen,
    TFilterTypes.sulfur
]

const headerFields: string[] = [
    'Фото',
    'Дата',
    'Кадров',
    'Выдержка',
    ...headerFieldsFilters
]

const PhotoTable: React.FC<TPhotoTableProps> = ({ photos }) => {
    const hideTableRows = useMemo(() => {
        let result: any[] = []

        headerFieldsFilters.forEach((filterName) => {
            if (
                !photos?.filter(
                    ({ filters }) =>
                        filters?.[filterName as keyof TFilters]?.frames
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
                                content={'Астрофотографй объекта не найдено'}
                            />
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
        </div>
    )
}

export default PhotoTable
