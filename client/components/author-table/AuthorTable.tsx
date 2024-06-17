import { ApiModel, useAppSelector } from '@/api'
import React from 'react'
import { Dimmer, Loader, Table } from 'semantic-ui-react'

import TableCellButtons from '@/components/table-cell-buttons'

import styles from './styles.module.sass'

type AuthorTableProps = {
    loading?: boolean
    authors?: ApiModel.Author[]
    onClickEdit?: (item: number) => void
    onClickDelete?: (item: number) => void
}

const AuthorTable: React.FC<AuthorTableProps> = (props) => {
    const { loading, authors, onClickEdit, onClickDelete } = props

    const user = useAppSelector((state) => state.auth.user)

    return (
        <div className={'box table'}>
            <Dimmer active={loading}>
                <Loader data-testid={'authors-loader'} />
            </Dimmer>
            <Table
                unstackable
                celled
                inverted
                selectable
                compact
                className={styles.authorTable}
            >
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell content={'Имя'} />
                        <Table.HeaderCell content={'Ссылка'} />
                        <Table.HeaderCell content={'Фотографий'} />
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {authors?.length ? (
                        authors.map((item) => (
                            <Table.Row key={item.id}>
                                <TableCellButtons
                                    itemId={item.id}
                                    name={item.name}
                                    isAdmin={user?.role === 'admin'}
                                    onClickEdit={onClickEdit}
                                    onClickDelete={onClickDelete}
                                />
                                <Table.Cell className={styles.cellLink}>
                                    {item.link && (
                                        <a
                                            href={item.link}
                                            title={item.name}
                                            target={'_blank'}
                                            rel={'noreferrer'}
                                        >
                                            {item.link}
                                        </a>
                                    )}
                                </Table.Cell>
                                <Table.Cell content={item?.photo_count || 0} />
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

export default AuthorTable
