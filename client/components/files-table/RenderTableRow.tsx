import { hosts } from '@/api/constants'
import { TFIle } from '@/api/types'
import { isMobile, sliceText } from '@/functions/helpers'
import moment from 'moment'
import Image from 'next/image'
import React from 'react'
import { Table } from 'semantic-ui-react'

import MoonPhase from '@/components/moon-phase'

import styles from './styles.module.sass'

type TTableRow = {
    file: TFIle
    itemId: number
    object: string
    showPreview?: boolean
    showAdditional?: boolean
    onPhotoClick: (photoId: number) => void
}

const RenderTableRow: React.FC<TTableRow> = ({
    file,
    itemId,
    object,
    showPreview,
    showAdditional,
    onPhotoClick
}) => (
    <Table.Row>
        {showPreview && (
            <Table.Cell
                collapsing={true}
                textAlign={'center'}
            >
                {file.preview ? (
                    <Image
                        className={styles.fitsImage}
                        onClick={() => onPhotoClick(itemId)}
                        src={`${hosts.fits}${object}/${file.file_name}_thumb.jpg`}
                        alt={file.file_name}
                        width={26}
                        height={17}
                    />
                ) : (
                    ''
                )}
            </Table.Cell>
        )}
        <Table.Cell content={sliceText(file.file_name, isMobile ? 20 : 250)} />
        <Table.Cell content={file.exptime} />
        <Table.Cell
            className={styles[file.filter]}
            content={file.filter}
        />
        <Table.Cell content={file.ccd_temp} />
        <Table.Cell content={file.gain} />
        <Table.Cell content={file.offset} />
        {showAdditional && (
            <>
                <Table.Cell content={file.star_count} />
                <Table.Cell content={file.sky_background} />
                <Table.Cell content={file.hfr} />
            </>
        )}
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
