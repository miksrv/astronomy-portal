import { useStatisticGetQuery } from '@/api/api'
import { declOfNum, getTimeFromSec } from '@/functions/helpers'
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

    const countFrames = data?.frames || 0
    const countObjects = data?.objects || 0

    const CARDS: TCards[] = [
        {
            icon: 'photo',
            name: declOfNum(countFrames, ['Кадр', 'Кадра', 'Кадров']),
            value: countFrames
        },
        {
            icon: 'clock outline',
            name: 'Выдержка',
            value: getTimeFromSec(data?.exposure || 0)
        },
        {
            icon: 'star outline',
            name: declOfNum(countObjects, ['Объект', 'Объекта', 'Объектов']),
            value: countObjects
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
