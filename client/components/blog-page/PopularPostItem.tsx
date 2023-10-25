import { hosts } from '@/api/constants'
import { TBlog } from '@/api/types'
import { isMobile, sliceText } from '@/functions/helpers'
import Image from 'next/image'
import React from 'react'
import { Grid } from 'semantic-ui-react'

import styles from './styles.module.sass'

const PopularPostItem: React.FC<Partial<TBlog> & { loading?: boolean }> = ({
    group_id,
    media,
    text
}) => {
    const mediaLink = media?.find(
        (media) => media.file_type !== 'video/mp4'
    )?.file

    return (
        <Grid.Row className={styles.popularItem}>
            <Grid.Column
                computer={4}
                mobile={5}
                className={styles.popularImageContainer}
            >
                <Image
                    className={styles.popularImage}
                    src={
                        mediaLink
                            ? `${hosts.post}${group_id}/${mediaLink}`
                            : '/images/no-photo.png'
                    }
                    alt={text || ''}
                    width={105}
                    height={85}
                />
            </Grid.Column>
            <Grid.Column
                computer={12}
                mobile={11}
            >
                {sliceText(text || '', isMobile ? 150 : 220)}
            </Grid.Column>
        </Grid.Row>
    )
}

export default PopularPostItem
