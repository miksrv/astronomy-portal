import { useStatisticGetQuery } from '@/api/api'
import { declOfNum, getTimeFromSec } from '@/functions/helpers'
import classNames from 'classnames'
import React from 'react'
import { Dimmer, Grid, Icon, Loader, SemanticICONS } from 'semantic-ui-react'

import styles from './styles.module.sass'

type StatisticCardType = {
    name: string
    icon: SemanticICONS
    value: number | string
}

const Statistic: React.FC = () => {
    const { data, isLoading } = useStatisticGetQuery()

    const CARDS: StatisticCardType[] = [
        {
            icon: 'photo',
            name: declOfNum(data?.frames || 0, ['Кадр', 'Кадра', 'Кадров']),
            value: data?.frames || 0
        },
        {
            icon: 'clock outline',
            name: 'Выдержка',
            value: getTimeFromSec(data?.exposure || 0)
        },
        {
            icon: 'star outline',
            name: declOfNum(data?.objects || 0, [
                'Объект',
                'Объекта',
                'Объектов'
            ]),
            value: data?.objects || 0
        },
        {
            icon: 'disk',
            name: 'Данных (Гб)',
            value: Math.round(((data?.filesize || 0) / 1024) * 100) / 100
        }
    ]

    return (
        <Grid className={styles.section}>
            <Grid.Row className={styles.section}>
                {CARDS.map((item) => (
                    <Grid.Column
                        key={item.name}
                        computer={4}
                        tablet={8}
                        mobile={16}
                    >
                        <div
                            className={classNames(
                                styles.statistic,
                                'box',
                                'table'
                            )}
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
            </Grid.Row>
        </Grid>
    )
}

export default Statistic
