import { hosts } from '@/api/constants'
import { FilterList, TPhoto } from '@/api/types'
import { getTimeFromSec, isMobile } from '@/functions/helpers'
import moment from 'moment'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Table } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TTableRowProps = {
    photo: TPhoto
    hideRows?: string[]
}

const RenderTableRow: React.FC<TTableRowProps> = ({ photo, hideRows }) => (
    <Table.Row>
        <Table.Cell width={'one'}>
            <Link
                href={`/photos/${photo.object}?date=${photo.date}`}
                title={`Перейти к другой фотографии объекта ${photo.object}`}
            >
                <Image
                    src={`${hosts.photo}${photo.image_name}_80x18.${photo.image_ext}`}
                    className={styles.photo}
                    alt={`Другой вариант фотографии объекта ${photo.object}`}
                    width={80}
                    height={18}
                />
            </Link>
        </Table.Cell>
        <Table.Cell content={moment(photo.date).format('DD.MM.Y')} />
        <Table.Cell content={photo.statistic?.frames || '---'} />
        <Table.Cell
            content={
                photo.statistic?.exposure
                    ? getTimeFromSec(photo.statistic.exposure, true)
                    : '---'
            }
        />
        {FilterList.filter((filter) =>
            isMobile ? !hideRows?.includes(filter) : true
        ).map((filter) => (
            <Table.Cell
                className={
                    filter && photo?.filters?.[filter]?.frames
                        ? styles[filter]
                        : ''
                }
                key={filter}
            >
                {photo.filters?.[filter]?.exposure
                    ? getTimeFromSec(photo?.filters?.[filter]?.exposure || 0)
                    : ''}
            </Table.Cell>
        ))}
    </Table.Row>
)

export default RenderTableRow
