import { TFIle } from '@/api/types'
import { isMobile, sliceText } from '@/functions/helpers'
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
                    src={`${process.env.NEXT_PUBLIC_API_HOST}uploads/${object}/${file.file_name}_thumb.jpg`}
                />
            ) : (
                ''
            )}
            {sliceText(file.file_name, isMobile ? 20 : 250)}
        </Table.Cell>
        <Table.Cell content={file.exptime} />
        <Table.Cell
            className={styles[file.filter]}
            content={file.filter}
        />
        <Table.Cell content={file.ccd_temp} />
        <Table.Cell content={file.gain} />
        <Table.Cell content={file.offset} />
        <Table.Cell content={file.star_count} />
        <Table.Cell content={file.sky_background} />
        <Table.Cell content={file.hfr} />
        <Table.Cell className={styles.moonDate}>
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
