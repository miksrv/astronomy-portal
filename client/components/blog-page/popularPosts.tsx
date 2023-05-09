import { imageHost } from '@/api/api'
import { TBlog } from '@/api/types'
import { isMobile, sliceText } from '@/functions/helpers'
import classNames from 'classnames'
import Image from 'next/image'
import React from 'react'
import { Dimmer, Grid, Loader } from 'semantic-ui-react'

import noPhoto from '@/public/images/no-photo.png'

import styles from './styles.module.sass'

type TPostGalleryProps = {
    loading?: boolean
    posts?: TBlog[]
}

const PopularPosts: React.FC<TPostGalleryProps> = ({ loading, posts }) => (
    <div className={classNames(styles.section, 'box')}>
        <div className={styles.popularHeader}>
            <h4>Популярное в блоге</h4>
            <div className={styles.dayCount}>за 30 дней</div>
        </div>
        <Dimmer active={loading}>
            <Loader />
        </Dimmer>
        <Grid>
            {loading
                ? Array(4)
                      .fill(1)
                      .map((item, key) => <PopularPostItem key={key} />)
                : posts?.map((post) => (
                      <PopularPostItem
                          key={post.id}
                          group_id={post.group_id}
                          media={post.media}
                          text={post.text}
                      />
                  ))}
        </Grid>
    </div>
)

const PopularPostItem: React.FC<Partial<TBlog> & { loading?: boolean }> = ({
    group_id,
    media,
    text
}) => {
    const imageUrl = imageHost + '/news/' + group_id + '/'

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
                    src={mediaLink ? `${imageUrl}${mediaLink}` : noPhoto}
                    alt={''}
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

export default PopularPosts
