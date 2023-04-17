import { TPhoto } from '@/api/types'
import { FilterList } from '@/api/types'
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

const RenderTableRow: React.FC<TTableRowProps> = ({ photo }) => (
    <Table.Row>
        <Table.Cell width={'one'}>
            <Link
                href={`/photos/${photo.object}?date=${photo.date}`}
                title={`Перейти к другой фотографии объекта ${photo.object}`}
            >
                <Image
                    src={`${process.env.NEXT_PUBLIC_IMG_HOST}public/photo/${photo.image_name}_thumb.${photo.image_ext}`}
                    className={styles.photo}
                    alt={`Другой вариант фотографии объекта ${photo.object}`}
                    width={80}
                    height={30}
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
        {FilterList.map((filter) => (
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
