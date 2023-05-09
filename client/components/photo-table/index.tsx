import { TFilterTypes, TFilters, TPhoto } from '@/api/types'
import { isMobile } from '@/functions/helpers'
import classNames from 'classnames'
import React, { useMemo } from 'react'
import { Dimmer, Loader, Table } from 'semantic-ui-react'

import RenderTableRow from './RenderTableRow'
import styles from './styles.module.sass'

type TPhotoTableProps = {
    loader?: boolean
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

const PhotoTable: React.FC<TPhotoTableProps> = ({ photos, loader }) => {
    const hideTableRows = useMemo(() => {
        let result: any[] = []

        headerFieldsFilters.forEach((filterName) => {
            if (
                !photos?.filter(
                    ({ filters }) => filters?.[filterName as keyof TFilters]
                )?.length
            ) {
                result.push(filterName)
            }
        })

        return result
    }, [photos])

    return (
        <div className={classNames(styles.section, 'table', 'box')}>
            <Dimmer active={loader}>
                <Loader />
            </Dimmer>
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
                            .filter((item) =>
                                isMobile ? !hideTableRows.includes(item) : true
                            )
                            .map((item, key) => (
                                <Table.HeaderCell
                                    key={key}
                                    className={'tableHeaderSticky'}
                                >
                                    {item}
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
