// import { useAppSelector } from '@/api/hooks'
import { TCatalog } from '@/api/types'
import { getTimeFromSec } from '@/functions/helpers'
import moment from 'moment'
import Link from 'next/link'
import React, { useState } from 'react'
import { Dimmer, Grid, Loader, Message } from 'semantic-ui-react'

import CelestialMap from '@/components/celestial-map'
import FilterList from '@/components/filter-list'
import ObjectFormModal from '@/components/obect-form-modal'

import styles from './styles.module.sass'

type TObjectHeaderProps = {
    title: string
    loader?: boolean
    error?: boolean
    catalog?: TCatalog
    deviationRa?: number
    deviationDec?: number
}

const ObjectSection: React.FC<TObjectHeaderProps> = (props) => {
    const { title, loader, error, catalog, deviationRa, deviationDec } = props
    // const userAuth = useAppSelector((state) => state.auth.userAuth)
    const date = catalog?.updated
        ? moment
              .utc(catalog.updated)
              .utcOffset('GMT+05:00')
              .format('D.MM.Y, H:mm')
        : '---'
    const exposure = catalog
        ? getTimeFromSec(catalog.statistic.exposure, true)
        : '---'
    const size = catalog?.statistic?.data_size
        ? Math.round((catalog.statistic.data_size / 1024) * 100) / 100
        : '0'

    const [editModalVisible, setEditModalVisible] = useState<boolean>(false)

    return (
        <div className={'box'}>
            <Dimmer active={loader || error}>
                <Loader active={loader} />
                <Message
                    error={true}
                    hidden={!error}
                    icon={'database'}
                    header={'Данные не доступны'}
                    content={
                        'На сервере возникла ошибка, попробуйте обновить страницу или зайти немного позже'
                    }
                />
            </Dimmer>
            <Grid>
                <Grid.Column
                    computer={10}
                    tablet={10}
                    mobile={16}
                >
                    <div className={styles.name}>
                        <h1>Объект: {title}</h1>
                        {/*{userAuth && (*/}
                        {/*    <div className={styles.controlButtons}>*/}
                        {/*        <Button*/}
                        {/*            size={'mini'}*/}
                        {/*            color={'blue'}*/}
                        {/*            icon={'edit outline'}*/}
                        {/*            onClick={() => setEditModalVisible(true)}*/}
                        {/*        />*/}
                        {/*        <Button*/}
                        {/*            size={'mini'}*/}
                        {/*            color={'red'}*/}
                        {/*            icon={'remove'}*/}
                        {/*        />*/}
                        {/*    </div>*/}
                        {/*)}*/}
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
                                    </span>
                                    {catalog?.category_name || '---'}
                                </div>
                                <div>
                                    <span className={styles.value}>
                                        Последний кадр:
                                    </span>
                                    {date}
                                </div>
                                <div>
                                    <span className={styles.value}>
                                        Сделано кадров:
                                    </span>
                                    {catalog?.statistic.frames || '0'}
                                </div>
                                <div>
                                    <span className={styles.value}>
                                        Общая выдержка:
                                    </span>
                                    {exposure}
                                </div>
                                <div>
                                    <span className={styles.value}>
                                        Накоплено данных:
                                    </span>
                                    {size} Гб
                                </div>
                                <div>
                                    <span className={styles.value}>
                                        Отклонение (RA / DEC):
                                    </span>
                                    {deviationRa} / {deviationDec}
                                </div>
                                <div>
                                    <span className={styles.value}>
                                        Координаты:
                                    </span>
                                    RA: {catalog?.coord_ra}, DEC:{' '}
                                    {catalog?.coord_dec}
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
                            <FilterList filters={catalog?.filters} />
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
                                    dec: catalog.coord_dec,
                                    name: catalog.name,
                                    ra: catalog.coord_ra
                                }
                            ]}
                        />
                    )}
                </Grid.Column>
            </Grid>
            <ObjectFormModal
                visible={editModalVisible}
                value={catalog!}
                onClose={() => setEditModalVisible(false)}
            />
        </div>
    )
}

export default ObjectSection
