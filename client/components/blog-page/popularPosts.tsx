import { TBlog } from '@/api/types'
import { sliceText } from '@/functions/helpers'
import classNames from 'classnames'
import Image from 'next/image'
import React from 'react'
import { Grid } from 'semantic-ui-react'

import noPhoto from '@/public/images/no-photo.png'

import styles from './styles.module.sass'

type TPostGalleryProps = {
    posts?: TBlog[]
}

const PopularPosts: React.FC<TPostGalleryProps> = ({ posts }) => {
    return (
        <>
            <div className={classNames(styles.popular, 'box')}>
                <div className={styles.popularHeader}>
                    <h4>Популярное в блоге</h4>
                    <div className={styles.dayCount}>за 30 дней</div>
                </div>
                <Grid>
                    {posts?.map((post, key) => {
                        const imageUrl =
                            process.env.NEXT_PUBLIC_API_HOST +
                            '/news/' +
                            post.group_id +
                            '/'

                        const mediaLink = post.media?.find(
                            (media) => media.file_type !== 'video/mp4'
                        )?.file

                        return (
                            <Grid.Row key={key}>
                                <Grid.Column
                                    width={4}
                                    className={styles.popularImageContainer}
                                >
                                    <Image
                                        className={styles.popularImage}
                                        src={
                                            mediaLink
                                                ? `${imageUrl}${mediaLink}`
                                                : noPhoto
                                        }
                                        alt={''}
                                        width={105}
                                        height={85}
                                    />
                                </Grid.Column>
                                <Grid.Column width={12}>
                                    {sliceText(post.text, 220)}
                                </Grid.Column>
                            </Grid.Row>
                        )
                    })}
                </Grid>
            </div>
        </>
    )
}

export default PopularPosts
