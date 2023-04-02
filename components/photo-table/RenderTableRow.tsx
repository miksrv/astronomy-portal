import { TFiltersTypes, TPhoto } from '@/api/types'
import { getTimeFromSec } from '@/functions/helpers'
import moment from 'moment'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Table } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TTableRowProps = {
    photo: TPhoto
}

const FILTERS: TFiltersTypes[] = [
    'Luminance',
    'Red',
    'Green',
    'Blue',
    'Ha',
    'OIII',
    'SII'
]

const RenderTableRow: React.FC<TTableRowProps> = (props) => {
    const { photo } = props

    return (
        <Table.Row>
            <Table.Cell width='one'>
                <Link
                    href={`/photos/${photo.object}?date=${photo.date}`}
                    title={photo.object}
                >
                    <Image
                        src={`${process.env.NEXT_PUBLIC_API_HOST}public/photo/${photo.file}_thumb.${photo.ext}`}
                        className={styles.photo}
                        alt={photo.object}
                        width={80}
                        height={30}
                    />
                </Link>
            </Table.Cell>
            <Table.Cell content={moment(photo.date).format('DD.MM.Y')} />
            <Table.Cell content={photo.parameters?.frames} />
            <Table.Cell
                content={
                    photo.parameters
                        ? getTimeFromSec(photo.parameters?.exposure, true)
                        : '---'
                }
            />
            {FILTERS.map((filter) => (
                <Table.Cell
                    className={
                        photo.parameters?.filters[filter] &&
                        photo.parameters?.filters[filter].frames > 0
                            ? `filter-${filter}`
                            : ''
                    }
                    key={filter}
                >
                    {photo.parameters?.filters[filter].exposure &&
                        getTimeFromSec(
                            photo.parameters?.filters[filter].exposure
                        )}
                </Table.Cell>
            ))}
        </Table.Row>
    )
}

export default RenderTableRow
