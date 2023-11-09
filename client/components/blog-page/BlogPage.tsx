import { useBlogGetListPopularQuery, useBlogGetStatisticQuery } from '@/api/api'
import { hosts } from '@/api/constants'
import { TBlog } from '@/api/types'
import { declOfNum, formatTimestamp } from '@/functions/helpers'
import classNames from 'classnames'
import React, { createRef } from 'react'
import {
    Button,
    Dimmer,
    Grid,
    Icon,
    Loader,
    Rail,
    Ref,
    Statistic,
    Sticky
} from 'semantic-ui-react'

import PopularPosts from '@/components/blog-page/PopularPosts'
import PostGallery from '@/components/blog-page/PostGallery'
import styles from '@/components/blog-page/styles.module.sass'
import Pagination from '@/components/pagination'

export const postPerPage: number = 4

export const getMediaFromPost = (posts?: TBlog) => {
    return posts?.media?.map((item) => ({
        height: item.height,
        url: `${hosts.post}${posts.group_id}/${item.file}`,
        width: item.width
    }))
}

type TBlogPage = {
    loading?: boolean
    posts?: TBlog[]
    total?: number
    page?: number
}

const BlogPage: React.FC<TBlogPage> = ({ loading, posts, total, page }) => {
    const { data: statisticData } = useBlogGetStatisticQuery()
    const { data: popularPosts, isLoading: popularLoading } =
        useBlogGetListPopularQuery({ limit: 4 })

    const contextRef = createRef()

    return (
        <Grid
            columns={2}
            className={styles.section}
        >
            <Grid.Row>
                <Grid.Column
                    computer={9}
                    mobile={16}
                >
                    <div className={styles.postsList}>
                        <Dimmer active={loading}>
                            <Loader />
                        </Dimmer>
                        {posts?.map((item) => (
                            <div
                                className={classNames(styles.item, 'box')}
                                key={item.id}
                            >
                                {item.media && (
                                    <PostGallery
                                        media={item.media}
                                        groupId={item.group_id}
                                    />
                                )}
                                <p className={styles.text}>{item.text}</p>
                                <div className={styles.footer}>
                                    <span className={styles.parameter}>
                                        <Icon name='eye' /> {item.views}
                                    </span>
                                    <span className={styles.parameter}>
                                        <Icon name='reply' /> {item.forwards}
                                    </span>
                                    <span className={styles.parameter}>
                                        <Icon name='comment' /> {item.replies}
                                    </span>
                                    <span className={styles.parameter}>
                                        <Icon name='like' />{' '}
                                        {item.reactions?.reduce(
                                            (count: number, reaction) =>
                                                count + reaction.count,
                                            0
                                        ) || 0}
                                    </span>
                                    <div className={styles.date}>
                                        <a
                                            href={`https://t.me/nearspace/${item.telegram_id}`}
                                            title={'Прочитать новость в канале'}
                                            rel={'nofollow'}
                                        >
                                            {formatTimestamp(
                                                item.telegram_date
                                            )}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Grid.Column>
                <Grid.Column
                    computer={7}
                    mobile={16}
                >
                    {/*@ts-ignore*/}
                    <Ref innerRef={contextRef}>
                        <Rail
                            position='right'
                            className={styles.rail}
                        >
                            {/*@ts-ignore*/}
                            <Sticky context={contextRef}>
                                <div
                                    className={classNames(
                                        styles.subscribeContainer,
                                        'box'
                                    )}
                                >
                                    <Button
                                        color={'linkedin'}
                                        as={'a'}
                                        target={'_blank'}
                                        href={'https://t.me/+QpMO8yF37DRVPail'}
                                        rel={'noindex nofollow'}
                                    >
                                        <Icon name='telegram' />
                                        {'Подписаться'}
                                    </Button>
                                    <Statistic
                                        className={styles.statistic}
                                        horizontal={true}
                                        inverted={true}
                                        size={'tiny'}
                                        floated={'right'}
                                        label={declOfNum(
                                            statisticData?.users || 0,
                                            [
                                                'участник',
                                                'участника',
                                                'участников'
                                            ]
                                        )}
                                        value={statisticData?.users || '?'}
                                    />
                                </div>
                                <PopularPosts
                                    loading={popularLoading}
                                    posts={popularPosts?.items}
                                />
                                <div className={'box'}>
                                    <Pagination
                                        currentPage={page}
                                        totalPostCount={total}
                                        perPage={postPerPage}
                                        linkPart={'blog'}
                                    />
                                </div>
                            </Sticky>
                        </Rail>
                    </Ref>
                </Grid.Column>
            </Grid.Row>
        </Grid>
    )
}

export default BlogPage
