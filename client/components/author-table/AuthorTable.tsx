import { useAppSelector } from '@/api/hooks'
import { TAuthor } from '@/api/types'
import React from 'react'
import { Dimmer, Loader, Table } from 'semantic-ui-react'

import TableCellButtons from '@/components/table-cell-buttons'

import styles from './styles.module.sass'

type TAuthorTable = {
    loading?: boolean
    authors?: TAuthor[]
    onClickEdit?: (item: number) => void
    onClickDelete?: (item: number) => void
}

const AuthorTable: React.FC<TAuthorTable> = (props) => {
    const { loading, authors, onClickEdit, onClickDelete } = props

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
                                    isAuth={userAuth}
                                    onClickEdit={onClickEdit}
                                    onClickDelete={onClickDelete}
                                />
                                <Table.Cell>
                                    {item.link && (
                                        <a
                                            href={item.link}
                                            title={item.name}
                                            target='_blank'
                                            rel='noreferrer'
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
