import { useAppSelector } from '@/api/hooks'
import { TPhoto } from '@/api/types'
import { FilterList } from '@/api/types'
import { getTimeFromSec, isOutdated } from '@/functions/helpers'
import Image from 'next/image'
import Link from 'next/link'
import React, { useMemo } from 'react'
import { Icon, Popup, Table } from 'semantic-ui-react'

import { TTableItem } from '@/components/object-table/types'

import styles from './styles.module.sass'

type TTableRowProps = {
    item: TTableItem
    photo?: TPhoto
    onShowEdit?: (item: string) => void
}

const RenderTableRow: React.FC<TTableRowProps> = (props) => {
    const { item, photo, onShowEdit } = props
    const userLogin = useAppSelector((state) => state.auth.status)
    const doTextTruncate = useMemo(() => {
        if (item?.text) {
            return item.text.length > 200
                ? item.text.slice(0, 200) + '...'
                : item.text
        }

        return ''
    }, [item])

    return (
        <Table.Row className={styles.tableRow}>
            <Table.Cell className={styles.cellCame}>
                <Popup
                    disabled={!item.title}
                    size={'mini'}
                    wide
                    header={item.title}
                    content={doTextTruncate}
                    trigger={
                        <Link
                            href={`/objects/${item.name}`}
                            title={`${
                                item.title || item.name
                            } - Подробная информация об объекте`}
                        >
                            {item.name}
                        </Link>
                    }
                />
                {userLogin && (
                    <>
                        <span
                            className={styles.controlButton}
                            role={'button'}
                            tabIndex={0}
                            onKeyUp={() => {}}
                            onClick={() => onShowEdit?.(item.name)}
                        >
                            <Icon name={'edit outline'} />
                        </span>
                        <span className={styles.controlButton}>
                            <Icon name={'remove'} />
                        </span>
                    </>
                )}
            </Table.Cell>
            <Table.Cell width='one'>
                {photo && (
                    <Link
                        href={`/photos/${item.name}`}
                        title={`${
                            item.title || item.name
                        } - Фотографии и история съемок`}
                        className={styles.photoLink}
                    >
                        <Image
                            className={styles.photo}
                            src={`${process.env.NEXT_PUBLIC_IMG_HOST}public/photo/${photo.image_name}_thumb.${photo.image_ext}`}
                            width={80}
                            height={18}
                            alt={`${item.title || item.name} - Фотография`}
                        />
                        {isOutdated(photo.date, item.updated) && (
                            <Popup
                                content={
                                    'Фотография устарела, так как есть новые данные ' +
                                    'с телескопа, с помощью которых можно собрать новое изображение объекта'
                                }
                                size={'mini'}
                                trigger={
                                    <Icon
                                        name={'clock outline'}
                                        className={styles.outdatedIcon}
                                    />
                                }
                            />
                        )}
                    </Link>
                )}
            </Table.Cell>
            <Table.Cell content={item.frames} />
            <Table.Cell content={getTimeFromSec(item.exposure)} />
            {FilterList.map((filter) => (
                <Table.Cell
                    key={filter}
                    className={item?.[filter] ? styles[filter] : undefined}
                    content={getTimeFromSec(item?.[filter] || 0)}
                />
            ))}
        </Table.Row>
    )
}

export default RenderTableRow
