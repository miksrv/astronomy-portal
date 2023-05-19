import { hosts } from '@/api/constants'
import { useAppSelector } from '@/api/hooks'
import { FilterList, TPhoto } from '@/api/types'
import {
    getTimeFromSec,
    isMobile,
    isOutdated,
    sliceText
} from '@/functions/helpers'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Icon, Popup, Table } from 'semantic-ui-react'

import { TTableItem } from '@/components/object-table/types'

import styles from './styles.module.sass'

type TTableRowProps = {
    item: TTableItem
    photo?: TPhoto
    onClickEdit?: (item: string) => void
    onClickDelete?: (item: string) => void
}

const RenderTableRow: React.FC<TTableRowProps> = (props) => {
    const { item, photo, onClickEdit, onClickDelete } = props
    const userAuth = useAppSelector((state) => state.auth.userAuth)

    return (
        <Table.Row className={styles.tableRow}>
            <Table.Cell
                className={styles.cellName}
                singleLine={true}
            >
                <Popup
                    disabled={!item.title || isMobile}
                    size={'mini'}
                    wide
                    header={item.title}
                    content={sliceText(item.text, 200)}
                    trigger={
                        <Link
                            href={`/objects/${item.name}`}
                            title={`${
                                item.title || item.name
                            } - Подробная информация об объекте`}
                        >
                            {item.source_link && (
                                <Icon
                                    name={'download'}
                                    className={styles.downloadIcon}
                                />
                            )}
                            {item.name}
                        </Link>
                    }
                />
                {userAuth && (
                    <div>
                        <span
                            className={styles.controlButton}
                            role={'button'}
                            tabIndex={0}
                            onKeyUp={() => {}}
                            onClick={() => onClickEdit?.(item.name)}
                        >
                            <Icon name={'edit outline'} />
                        </span>
                        <span
                            className={styles.controlButton}
                            role={'button'}
                            tabIndex={0}
                            onKeyUp={() => {}}
                            onClick={() => onClickDelete?.(item.name)}
                        >
                            <Icon name={'remove'} />
                        </span>
                    </div>
                )}
            </Table.Cell>
            <Table.Cell width={'one'}>
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
                            src={`${hosts.photo}${photo.image_name}_80x18.${photo.image_ext}`}
                            width={80}
                            height={18}
                            alt={`${item.title || item.name} - Фотография`}
                        />
                        {isOutdated(photo.date, item.updated) && (
                            <Popup
                                disabled={isMobile}
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
                    content={item?.[filter] ? getTimeFromSec(item[filter]) : ''}
                />
            ))}
        </Table.Row>
    )
}

export default RenderTableRow
