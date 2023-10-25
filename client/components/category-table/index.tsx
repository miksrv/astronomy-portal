import { useAppSelector } from '@/api/hooks'
import { TCategory } from '@/api/types'
import React from 'react'
import { Dimmer, Loader, Table } from 'semantic-ui-react'

import TableCellButtons from '@/components/table-cell-buttons'

import styles from './styles.module.sass'

type TCategoryTable = {
    loading?: boolean
    categories?: TCategory[]
    onClickEdit?: (item: number) => void
    onClickDelete?: (item: number) => void
}

const CategoryTable: React.FC<TCategoryTable> = (props) => {
    const { loading, categories, onClickEdit, onClickDelete } = props

    const userAuth = useAppSelector((state) => state.auth.userAuth)

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
                                    isAuth={userAuth}
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
