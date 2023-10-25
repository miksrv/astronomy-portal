import React from 'react'
import { Icon, Table } from 'semantic-ui-react'

import styles from './styles.module.sass'

interface TableCellButtonsProps {
    itemId?: number
    name?: string
    isAuth?: boolean
    onClickEdit?: (itemId: number) => void
    onClickDelete?: (itemId: number) => void
}

const TableCellButtons: React.FC<TableCellButtonsProps> = ({
    itemId,
    name,
    isAuth,
    onClickEdit,
    onClickDelete
}) => (
    <Table.Cell
        className={styles.cellName}
        colSpan={2}
    >
        {name}
        {isAuth && (
            <div>
                {onClickEdit && (
                    <span
                        className={styles.controlButton}
                        role={'button'}
                        tabIndex={0}
                        onKeyUp={() => {}}
                        onClick={() => onClickEdit?.(itemId!)}
                    >
                        <Icon name={'edit outline'} />
                    </span>
                )}
                {onClickDelete && (
                    <span
                        className={styles.controlButton}
                        role={'button'}
                        tabIndex={0}
                        onKeyUp={() => {}}
                        onClick={() => onClickDelete?.(itemId!)}
                    >
                        <Icon name={'remove'} />
                    </span>
                )}
            </div>
        )}
    </Table.Cell>
)

export default TableCellButtons
