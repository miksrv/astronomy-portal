import { useAppSelector } from '@/api/hooks'
import { TCatalog, TObject } from '@/api/types'
import { getTimeFromSec } from '@/functions/helpers'
import moment from 'moment'
import Link from 'next/link'
import React, { useState } from 'react'
import { Button, Dimmer, Grid, Loader } from 'semantic-ui-react'

import CelestialMap from '@/components/celestial-map'
import FilterList from '@/components/filter-list'
import ObjectEditModal from '@/components/obect-edit-modal'

import styles from './styles.module.sass'

type TObjectHeaderProps = {
    title: string
    loader?: boolean
    catalog?: TCatalog
    object?: TObject
    deviationRa?: number
    deviationDec?: number
}

const ObjectSection: React.FC<TObjectHeaderProps> = (props) => {
    const { title, loader, catalog, object, deviationRa, deviationDec } = props
    const userLogin = useAppSelector((state) => state.auth.status)
    const date = object
        ? moment.utc(object.date).utcOffset('GMT+05:00').format('D.MM.Y, H:mm')
        : '---'
    const exposure = object ? getTimeFromSec(object.exposure, true) : '---'
    const size = object
        ? Math.round((object.filesizes / 1024) * 100) / 100
        : '---'

    const [editModalVisible, setEditModalVisible] = useState<boolean>(false)

    return (
        <div className={'box'}>
            <Dimmer active={loader}>
                <Loader />
            </Dimmer>
            <Grid>
                <Grid.Column
                    computer={10}
                    tablet={10}
                    mobile={16}
                >
                    <div className={styles.name}>
                        <h1>Объект: {title}</h1>
                        {userLogin && (
                            <div className={styles.controlButtons}>
                                <Button
                                    size={'mini'}
                                    color={'blue'}
                                    icon={'edit outline'}
                                    onClick={() => setEditModalVisible(true)}
                                />
                                <Button
                                    size={'mini'}
                                    color={'red'}
                                    icon={'remove'}
                                />
                            </div>
                        )}
                    </div>
                    <Grid>
                        <Grid.Column
                            computer={8}
                            tablet={8}
                            mobile={16}
                        >
                            <div className={styles.parameters}>
                                <div>
                                    <span className={styles.value}>
                                        Категория:
                                    </span>{' '}
                                    {catalog?.category || '---'}
                                </div>
                                <div>
                                    <span className={styles.value}>
                                        Последний кадр:
                                    </span>{' '}
                                    {date}
                                </div>
                                <div>
                                    <span className={styles.value}>
                                        Сделано кадров:
                                    </span>{' '}
                                    {object?.frames || '---'}
                                </div>
                                <div>
                                    <span className={styles.value}>
                                        Общая выдержка:
                                    </span>{' '}
                                    {exposure}
                                </div>
                                <div>
                                    <span className={styles.value}>
                                        Накоплено данных:
                                    </span>{' '}
                                    {size} Гб
                                </div>
                                <div>
                                    <span className={styles.value}>
                                        Отклонение (RA / DEC):
                                    </span>{' '}
                                    {deviationRa} / {deviationDec}{' '}
                                </div>
                            </div>
                            <Link
                                href={'/objects/'}
                                title={'Список всех астрономических объектов'}
                            >
                                Вернуться к списку всех объектов
                            </Link>
                        </Grid.Column>
                        <Grid.Column
                            computer={8}
                            tablet={8}
                            mobile={16}
                        >
                            {!loader && object && (
                                <FilterList filters={object.filters} />
                            )}
                        </Grid.Column>
                    </Grid>
                </Grid.Column>
                <Grid.Column
                    computer={6}
                    tablet={6}
                    mobile={16}
                    className={styles.celestialMap}
                >
                    {catalog && (
                        <CelestialMap
                            objects={[
                                {
                                    dec: catalog.dec,
                                    name: catalog.name,
                                    ra: catalog.ra
                                }
                            ]}
                        />
                    )}
                </Grid.Column>
            </Grid>
            <ObjectEditModal
                visible={editModalVisible}
                value={catalog!}
                onClose={() => setEditModalVisible(false)}
            />
        </div>
    )
}

export default ObjectSection