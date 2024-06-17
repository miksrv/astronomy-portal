import { ApiModel, useAppSelector } from '@/api'
import React from 'react'
import { Dimmer, Loader, Table } from 'semantic-ui-react'

import TableCellButtons from '@/components/table-cell-buttons'

import styles from './styles.module.sass'

interface CategoryTableProps {
    loading?: boolean
    categories?: ApiModel.Category[]
    onClickEdit?: (item: number) => void
    onClickDelete?: (item: number) => void
}

const CategoryTable: React.FC<CategoryTableProps> = (props) => {
    const { loading, categories, onClickEdit, onClickDelete } = props

    const user = useAppSelector((state) => state.auth.user)

    return (
        <div className={'box table'}>
            <Dimmer active={loading}>
                <Loader />
            </Dimmer>
            <Table
                unstackable
                celled
                inverted
                selectable
                compact
                className={styles.categoryTable}
            >
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell content={'Категории объектов'} />
                        <Table.HeaderCell content={'Объектов'} />
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {categories?.length ? (
                        categories.map((item) => (
                            <Table.Row key={item.id}>
                                <TableCellButtons
                                    itemId={item.id}
                                    name={item.name}
                                    isAdmin={user?.role === 'admin'}
                                    onClickEdit={onClickEdit}
                                    onClickDelete={onClickDelete}
                                />
                                <Table.Cell content={item?.object_count || 0} />
                            </Table.Row>
                        ))
                    ) : (
                        <Table.Row>
                            <Table.Cell
                                textAlign={'center'}
                                content={'Нет данных для отображения'}
                            />
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
        </div>
    )
}

export default CategoryTable
