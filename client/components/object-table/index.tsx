import { TCatalog, TCategory, TPhoto } from '@/api/types'
import React, { useMemo, useState } from 'react'
import { Dimmer, Loader, Table } from 'semantic-ui-react'

import RenderTableHeader, { HeaderFields } from './RenderTableHeader'
import RenderTableRow from './RenderTableRow'
import styles from './styles.module.sass'
import { TSortKey, TSortOrdering, TTableItem } from './types'

type TObjectTable = {
    loading?: boolean
    categories?: TCategory[]
    catalog?: TCatalog[]
    photos?: TPhoto[]
    onClickEdit?: (item: string) => void
    onClickDelete?: (item: string) => void
}

const ObjectTable: React.FC<TObjectTable> = (props) => {
    const { loading, categories, catalog, photos, onClickEdit, onClickDelete } =
        props
    const [sortField, setSortField] = useState<TSortKey>('name')
    const [sortOrder, setSortOrder] = useState<TSortOrdering>('descending')

    const itemsCatalog: TTableItem[] | undefined = useMemo(
        () =>
            catalog?.map((item) => ({
                blue: item.filters?.blue?.exposure || 0,
                category:
                    categories?.find(({ id }) => id === item.category)?.name ||
                    '',
                clear: item.filters?.clear?.exposure || 0,
                exposure: item.statistic.exposure,
                frames: item.statistic.frames,
                green: item.filters?.green?.exposure || 0,
                hydrogen: item.filters?.hydrogen?.exposure || 0,
                luminance: item.filters?.luminance?.exposure || 0,
                name: item.name,
                oxygen: item.filters?.oxygen?.exposure || 0,
                photo:
                    photos?.filter(({ object }) => object === item.name)
                        .length || 0,
                red: item.filters?.red?.exposure || 0,
                sulfur: item.filters?.sulfur?.exposure || 0,
                text: item.text,
                title: item.title,
                updated: item.updated
            })),
        [catalog, photos]
    )

    const sortedCatalog = useMemo(
        () =>
            itemsCatalog?.sort((a, b) =>
                sortOrder === 'descending'
                    ? a[sortField] > b[sortField]
                        ? 1
                        : -1
                    : a[sortField] < b[sortField]
                    ? 1
                    : -1
            ),
        [itemsCatalog, sortOrder, sortField]
    )

    const handlerSortClick = (field: TSortKey) => {
        if (sortField !== field) setSortField(field)
        else
            setSortOrder(sortOrder === 'ascending' ? 'descending' : 'ascending')
    }

    return (
        <div className={'box table'}>
            <Dimmer active={loading}>
                <Loader />
            </Dimmer>
            <Table
                sortable
                celled
                inverted
                selectable
                compact
                className={styles.objectTable}
            >
                <RenderTableHeader
                    sort={sortField}
                    order={sortOrder}
                    handlerSortClick={handlerSortClick}
                />
                <Table.Body>
                    {sortedCatalog?.length ? (
                        sortedCatalog.map((item) => (
                            <RenderTableRow
                                key={item.name}
                                item={item}
                                photo={photos?.find(
                                    ({ object }) => object === item.name
                                )}
                                onClickEdit={() => {
                                    onClickEdit?.(item.name)
                                }}
                                onClickDelete={() => {
                                    onClickDelete?.(item.name)
                                }}
                            />
                        ))
                    ) : (
                        <Table.Row>
                            <Table.Cell
                                textAlign={'center'}
                                colSpan={HeaderFields.length}
                                content={
                                    'Ничего не найдено, попробуйте изменить условия поиска'
                                }
                            />
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
        </div>
    )
}

export default ObjectTable
