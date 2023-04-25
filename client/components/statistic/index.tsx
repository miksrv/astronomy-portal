import { useStatisticGetQuery } from '@/api/api'
import { getTimeFromSec } from '@/functions/helpers'
import classNames from 'classnames'
import React from 'react'
import { Dimmer, Grid, Icon, Loader, SemanticICONS } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TCards = {
    name: string
    icon: SemanticICONS
    value: number | string
}

const Statistic: React.FC = () => {
    const { data, isLoading } = useStatisticGetQuery()

    const CARDS: TCards[] = [
        { icon: 'photo', name: 'Кадров', value: data?.frames_count || 0 },
        {
            icon: 'clock outline',
            name: 'Выдержка',
            value: getTimeFromSec(data?.total_exposure || 0)
        },
        {
            icon: 'star outline',
            name: 'Объектов',
            value: data?.catalog_count || 0
        },
        {
            icon: 'disk',
            name: 'Данных (Гб)',
            value: Math.round(((data?.files_size || 0) / 1024) * 100) / 100
        }
    ]

    return (
        <Grid>
            {CARDS.map((item, key) => (
                <Grid.Column
                    key={key}
                    computer={4}
                    tablet={8}
                    mobile={16}
                >
                    <div
                        className={classNames(styles.statistic, 'box', 'table')}
                    >
                        <Dimmer active={isLoading}>
                            <Loader />
                        </Dimmer>
                        <div className={styles.iconContainer}>
                            <Icon
                                name={item.icon}
                                className={styles.icon}
                            />
                        </div>
                        <div>
                            <div className={styles.value}>{item.value}</div>
                            <div className={styles.info}>{item.name}</div>
                        </div>
                    </div>
                </Grid.Column>
            ))}
        </Grid>
    )
}

export default Statistic
