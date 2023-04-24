import { useAppSelector } from '@/api/hooks'
import { TCategory } from '@/api/types'
import React from 'react'
import { Dimmer, Icon, Loader, Table } from 'semantic-ui-react'

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
                                <Table.Cell
                                    className={styles.cellCame}
                                    colSpan={2}
                                >
                                    {item.name}
                                    {userAuth && (
                                        <div>
                                            <span
                                                className={styles.controlButton}
                                                role={'button'}
                                                tabIndex={0}
                                                onKeyUp={() => {}}
                                                onClick={() =>
                                                    onClickEdit?.(item.id)
                                                }
                                            >
                                                <Icon name={'edit outline'} />
                                            </span>
                                            <span
                                                className={styles.controlButton}
                                                role={'button'}
                                                tabIndex={0}
                                                onKeyUp={() => {}}
                                                onClick={() =>
                                                    onClickDelete?.(item.id)
                                                }
                                            >
                                                <Icon name={'remove'} />
                                            </span>
                                        </div>
                                    )}
                                </Table.Cell>
                                <Table.Cell content={item?.count || 0} />
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
