import { TFIle } from '@/api/types'
import moment from 'moment'
import React from 'react'
import { Image, Table } from 'semantic-ui-react'

import MoonPhase from '@/components/moon-phase'

import styles from './styles.module.sass'

type TTableRow = {
    file: TFIle
    itemId: number
    object: string
    onPhotoClick: (photoId: number) => void
}

const RenderTableRow: React.FC<TTableRow> = ({
    file,
    itemId,
    object,
    onPhotoClick
}) => (
    <Table.Row>
        <Table.Cell>
            {file.image ? (
                <Image
                    className={styles.fitsImage}
                    onClick={() => onPhotoClick(itemId)}
                    src={`${process.env.NEXT_PUBLIC_IMG_HOST}uploads/${object}/${file.file_name}_thumb.jpg`}
                />
            ) : (
                ''
            )}
            {file.file_name}
        </Table.Cell>
        <Table.Cell>{file.exptime}</Table.Cell>
        <Table.Cell className={styles[file.filter]}>{file.filter}</Table.Cell>
        <Table.Cell>{file.ccd_temp}</Table.Cell>
        <Table.Cell>{file.gain}</Table.Cell>
        <Table.Cell>{file.offset}</Table.Cell>
        <Table.Cell>{file.star_count}</Table.Cell>
        <Table.Cell>{file.sky_background}</Table.Cell>
        <Table.Cell>{file.hfr}</Table.Cell>
        <Table.Cell>
            <MoonPhase
                date={moment.utc(file.date_obs).utcOffset('GMT+05:00')}
            />
            {moment
                .utc(file.date_obs)
                .utcOffset('GMT+05:00')
                .format('D.MM.Y, H:mm')}
        </Table.Cell>
    </Table.Row>
)

export default RenderTableRow
