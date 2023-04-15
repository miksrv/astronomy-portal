import { TCatalog, TFilters, TStatistic } from '@/api/types'
import React from 'react'
import { Table } from 'semantic-ui-react'

import { TSortKey } from './types'
import { TSortOrdering } from './types'

type TTableHeaderProps = {
    sort: TSortKey
    order: TSortOrdering
    handlerSortClick: (field: TSortKey) => void
}

type THeaderFields = {
    key: TSortKey
    name: string
}

export const HeaderFields: THeaderFields[] = [
    { key: 'name', name: 'Объект' },
    { key: 'photo', name: 'Фото' },
    { key: 'frames', name: 'Кадров' },
    { key: 'exposure', name: 'Выдержка' },
    { key: 'luminance', name: 'Luminance' },
    { key: 'red', name: 'Red' },
    { key: 'green', name: 'Green' },
    { key: 'blue', name: 'Blue' },
    { key: 'hydrogen', name: 'Ha' },
    { key: 'oxygen', name: 'OIII' },
    { key: 'sulfur', name: 'SII' }
]

const RenderTableHeader: React.FC<TTableHeaderProps> = ({
    sort,
    order,
    handlerSortClick
}) => (
    <Table.Header>
        <Table.Row>
            {HeaderFields.map((item) => (
                <Table.HeaderCell
                    key={item.key}
                    sorted={sort === item.key ? order : undefined}
                    onClick={() => handlerSortClick(item.key)}
                >
                    {item.name}
                </Table.HeaderCell>
            ))}
        </Table.Row>
    </Table.Header>
)

export default RenderTableHeader
