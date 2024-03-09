import { APIResponseStatistic } from '@/api/types'
import { declOfNum, getTimeFromSec } from '@/functions/helpers'
import classNames from 'classnames'
import React from 'react'
import { Grid, Icon, SemanticICONS } from 'semantic-ui-react'

import styles from './styles.module.sass'

type StatisticCardType = {
    name: string
    icon: SemanticICONS
    value: number | string
}

interface StatisticProps extends APIResponseStatistic {}

const Statistic: React.FC<StatisticProps> = ({ ...props }) => {
    const CARDS: StatisticCardType[] = [
        {
            icon: 'photo',
            name: declOfNum(props?.frames || 0, ['Кадр', 'Кадра', 'Кадров']),
            value: props?.frames || 0
        },
        {
            icon: 'clock outline',
            name: 'Выдержка',
            value: getTimeFromSec(props?.exposure || 0)
        },
        {
            icon: 'star outline',
            name: declOfNum(props?.objects || 0, [
                'Объект',
                'Объекта',
                'Объектов'
            ]),
            value: props?.objects || 0
        },
        {
            icon: 'disk',
            name: 'Данных (Гб)',
            value: Math.round(((props?.filesize || 0) / 1024) * 100) / 100
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
