import { TBlog } from '@/api/types'
import { range } from '@/functions/helpers'
import classNames from 'classnames'
import React from 'react'
import { Dimmer, Grid, Loader } from 'semantic-ui-react'

import PopularPostItem from '@/components/blog-page/PopularPostItem'

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
            <Loader data-testid={'popular-loader'} />
        </Dimmer>
        <Grid>
            {loading
                ? range(1, 4).map((item) => <PopularPostItem key={item} />)
                : posts?.map((post) => (
                      <PopularPostItem
                          key={post.id}
                          telegram_id={post.telegram_id}
                          group_id={post.group_id}
                          media={post.media}
                          text={post.text}
                      />
                  ))}
        </Grid>
    </div>
)

export default PopularPosts
