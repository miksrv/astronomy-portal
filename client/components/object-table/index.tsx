import { TCatalog, TPhoto } from '@/api/types'
import React, { useMemo, useState } from 'react'
import { Dimmer, Loader, Table } from 'semantic-ui-react'

import ObjectEditModal from '@/components/obect-edit-modal'

import RenderTableHeader, { HEADER_FIELDS } from './RenderTableHeader'
import RenderTableRow from './RenderTableRow'
import styles from './styles.module.sass'
import { TObjectSortable, TSortOrdering } from './types'

type TObjectTable = {
    loading?: boolean
    catalog?: TCatalog[]
    photos?: TPhoto[]
}

const ObjectTable: React.FC<TObjectTable> = (props) => {
    const { loading, catalog, photos } = props
    const [sortField, setSortField] = useState<TObjectSortable>('name')
    const [sortOrder, setSortOrder] = useState<TSortOrdering>('descending')
    const [editModalVisible, setEditModalVisible] = useState<boolean>(false)
    const [editModalValue, setEditModalValue] = useState<TCatalog>()

    const catalogPhotos = useMemo(() => {
        return catalog?.map((item) => {
            const objectPhotos = photos?.filter(
                (photo) => photo.object === item.name
            )
            return {
                ...item,
                photo: objectPhotos ? objectPhotos.length : 0
            }
        })
    }, [catalog, photos])

    const listSortedObjects = useMemo(() => {
        return catalogPhotos?.sort((a, b) =>
            sortOrder === 'descending'
                ? // @ts-ignore
                  a[sortField] > b[sortField]
                    ? 1
                    : -1
                : // @ts-ignore
                a[sortField] < b[sortField]
                ? 1
                : -1
        )
    }, [catalogPhotos, sortOrder, sortField])

    const handlerSortClick = (field: TObjectSortable) => {
        if (sortField !== field) setSortField(field)
        else
            setSortOrder(sortOrder === 'ascending' ? 'descending' : 'ascending')
    }

    // const handlerShowEditModal = () => {
    //
    // }

    return (
        <div className='box table'>
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
                    handlerSortClick={(field: TObjectSortable) =>
                        handlerSortClick(field)
                    }
                />
                <Table.Body>
                    {listSortedObjects?.length ? (
                        listSortedObjects.map((item) => (
                            <RenderTableRow
                                key={item.name}
                                item={item}
                                photo={photos?.find(
                                    ({ object }) => object === item.name
                                )}
                                onShowEdit={() => {
                                    setEditModalValue(item)
                                    setEditModalVisible(true)
                                }}
                            />
                        ))
                    ) : (
                        <RowNoData />
                    )}
                </Table.Body>
            </Table>
            <ObjectEditModal
                visible={editModalVisible}
                skyMapVisible={true}
                value={editModalValue}
                onClose={() => setEditModalVisible(false)}
            />
        </div>
    )
}

const RowNoData: React.FC = () => (
    <Table.Row>
        <Table.Cell
            textAlign={'center'}
            colSpan={HEADER_FIELDS.length}
            content={'Ничего не найдено, попробуйте изменить условия поиска'}
        />
    </Table.Row>
)

export default ObjectTable
