import React, { useMemo } from 'react'
import { Icon, Popup, Table } from 'semantic-ui-react'
import Image from "next/image";
import Link from "next/link";

import { useAppSelector } from '@/api/hooks'
import { IObjectListItem, TCatalog, TFiltersTypes, TPhoto } from '@/api/types'

import { getTimeFromSec, isOutdated } from '@/functions/helpers'

import styles from './styles.module.sass'

type TTableRowProps = {
    item: IObjectListItem & TCatalog
    photos: TPhoto[] | undefined
    onShowEdit?: (item: string) => void
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
    const { item, photos, onShowEdit } = props
    const userLogin = useAppSelector((state) => state.auth.status)
    const photoList =
        photos && photos.filter((photo) => photo.object === item.name)
    const photoItem = photoList && photoList.pop()
    const textMaxLength = 200

    const doTextTruncate = useMemo(() => {
        if (item?.text) {
            return item.text.length > textMaxLength
                ? item.text.slice(0, textMaxLength) + '...'
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
                            title={`${item.category} ${item.title || item.name} - Подробная информация об объекте`}
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
                {photoItem && (
                    <Link
                        href={`/photos/${item.name}`}
                        title={`${item.title || item.name} - Фотографии и история съемок`}
                        className={styles.photoLink}
                    >
                        <Image
                            className={styles.photo}
                            src={`${process.env.NEXT_PUBLIC_API_HOST}public/photo/${photoItem.file}_thumb.${photoItem.ext}`}
                            width={80}
                            height={18}
                            alt={`${item.title || item.name} - Фотография`}
                        />
                        {isOutdated(photoItem.date, item.date) && (
                            <Popup
                                content={
                                    'Фотография устарела, так как есть новые данные ' +
                                    'с телескопа, с помощью которых можно собрать новое изображение объекта'
                                }
                                size='mini'
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
            {FILTERS.map((filter) => (
                <Table.Cell
                    key={filter}
                    className={item[filter] > 0 ? `filter-${filter}` : ''}
                    content={getTimeFromSec(item[filter])}
                />
            ))}
        </Table.Row>
    )
}

export default RenderTableRow
