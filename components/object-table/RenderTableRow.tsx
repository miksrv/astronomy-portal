import React, { useMemo } from 'react'
import { Icon, Image, Popup, Table } from 'semantic-ui-react'

import { useAppSelector } from '@/api/hooks'
import { IObjectListItem, TCatalog, TFiltersTypes, TPhoto } from '@/api/types'

import { getTimeFromSec, isOutdated } from '@/functions/helpers'

import styles from './ObjectTable.module.sass'

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
                    size='mini'
                    wide
                    header={item.title}
                    content={doTextTruncate}
                    trigger={
                        <a href={`/objects/${item.name}`}>{item.name}</a>
                    }
                />
                {userLogin && (
                    <div>
                        <span
                            className={styles.controlButton}
                            role='button'
                            tabIndex={0}
                            onKeyUp={() => {}}
                            onClick={() => onShowEdit?.(item.name)}
                        >
                            <Icon name='edit outline' />
                        </span>
                        <span className={styles.controlButton}>
                            <Icon name='remove' />
                        </span>
                    </div>
                )}
            </Table.Cell>
            <Table.Cell width='one'>
                {photoItem && (
                    <a
                        href={`/photo/${item.name}`}
                        className={styles.photoLink}
                    >
                        <Image
                            className={styles.photo}
                            size='tiny'
                            src={`${process.env.NEXT_PUBLIC_API_HOST}public/photo/${photoItem.file}_thumb.${photoItem.ext}`}
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
                                        name='clock outline'
                                        className={styles.outdatedIcon}
                                    />
                                }
                            />
                        )}
                    </a>
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
