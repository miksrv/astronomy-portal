import { TNews } from '@/api/types'
import React from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'

import NewsItem from './NewsItem'
import styles from './styles.module.sass'

type TNewsListProps = {
    loader: boolean
    news: TNews[] | undefined
}

const NewsLoader = () => (
    <div className={'box loader'}>
        <Dimmer active>
            <Loader>Загрузка</Loader>
        </Dimmer>
    </div>
)

const NewsList: React.FC<TNewsListProps> = (props) => {
    const { loader, news } = props

    return (
        <>
            {loader ? (
                <NewsLoader />
            ) : (
                <div className={styles.newsList}>
                    {news?.map((item, key) => (
                        <NewsItem
                            news={item}
                            key={key}
                        />
                    ))}
                </div>
            )}
        </>
    )
}

export default NewsList
