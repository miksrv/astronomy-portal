import React from 'react'
import { Icon, Table } from 'semantic-ui-react'

import { TObjectSortable, TSortOrdering } from './types'

type TTableHeader = {
    sort: TObjectSortable
    order: TSortOrdering
    showPreview?: boolean
    showAdditional?: boolean
    handlerSortClick?: (field: TObjectSortable) => void
}

type THeaderFields = {
    key: TObjectSortable
    name: string
}

export const HEADER_FIELDS: THeaderFields[] = [
    { key: 'preview', name: '' },
    { key: 'file_name', name: 'Имя файла' },
    { key: 'exptime', name: 'sec' },
    { key: 'filter', name: 'Фильтр' },
    { key: 'ccd_temp', name: '°C' },
    { key: 'gain', name: 'Gain' },
    { key: 'offset', name: 'Offset' },
    { key: 'star_count', name: 'Звезд' },
    { key: 'sky_background', name: 'SNR' },
    { key: 'hfr', name: 'HFR' },
    { key: 'date_obs', name: 'Дата съемки' }
]

const RenderTableHeader: React.FC<TTableHeader> = ({
    sort,
    order,
    showPreview,
    showAdditional,
    handlerSortClick
}) => (
    <Table.Header>
        <Table.Row>
            {HEADER_FIELDS.filter(
                (item) =>
                    (!showAdditional
                        ? !['star_count', 'sky_background', 'hfr'].includes(
                              item.key
                          )
                        : true) &&
                    (!showPreview ? item.key !== 'preview' : true)
            ).map((item) => (
                <Table.HeaderCell
                    key={item.key}
                    className={'tableHeaderSticky'}
                    sorted={sort === item.key ? order : undefined}
                    onClick={() => handlerSortClick?.(item.key)}
                    aria-sort={order}
                    content={
                        item.key === 'preview' ? (
                            <Icon name={'image'} />
                        ) : (
                            item.name
                        )
                    }
                />
            ))}
        </Table.Row>
    </Table.Header>
)

export default RenderTableHeader
