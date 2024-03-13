import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { formatDate } from '@/functions/helpers'
import Image from 'next/image'
import React from 'react'
import { Table } from 'semantic-ui-react'

import MoonPhase from '@/components/moon-phase'

import styles from './styles.module.sass'

interface RenderTableRowProps {
    file: ApiModel.File.Item
    itemId: number
    object: string
    showPreview?: boolean
    showAdditional?: boolean
    onPhotoClick: (photoId: number) => void
}

const RenderTableRow: React.FC<RenderTableRowProps> = ({
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
        <Table.Cell
            className={styles.cellFileName}
            content={<span>{file.file_name}</span>}
        />
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
            <MoonPhase date={file.date_obs} />
            {formatDate(file.date_obs)}
        </Table.Cell>
    </Table.Row>
)

export default RenderTableRow
