import { editCatalog, openFormCatalog } from '@/api/applicationSlice'
import { hosts } from '@/api/constants'
import { useAppDispatch, useAppSelector } from '@/api/hooks'
import { TCatalog } from '@/api/types'
import { getTimeFromSec } from '@/functions/helpers'
import classNames from 'classnames'
import moment from 'moment'
import Image from 'next/image'
import React from 'react'
import { Dimmer, Grid, Icon, Loader, Message } from 'semantic-ui-react'

import FilterList from '@/components/filter-list'

import noImageServerUrl from '@/public/images/no-photo.png'

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

    const dispatch = useAppDispatch()
    const userAuth = useAppSelector((state) => state.auth.userAuth)

    const date = catalog?.updated
        ? moment
              .utc(catalog.updated)
              .utcOffset('GMT+05:00')
              .format('D.MM.Y, H:mm')
        : '---'
    const exposure = catalog?.statistic?.exposure
        ? getTimeFromSec(catalog.statistic.exposure, true)
        : '---'
    const size = catalog?.statistic?.data_size
        ? Math.round((catalog.statistic.data_size / 1024) * 100) / 100
        : undefined

    const handleEditCatalog = () => {
        dispatch(editCatalog(catalog))
        dispatch(openFormCatalog(true))
    }

    return (
        <div className={classNames(styles.section, 'box')}>
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
                    <h1>
                        {title}
                        {userAuth && (
                            <span
                                className={styles.controlButton}
                                role={'button'}
                                tabIndex={0}
                                onKeyUp={() => {}}
                                onClick={handleEditCatalog}
                            >
                                <Icon name={'edit outline'} />
                            </span>
                        )}
                    </h1>
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
                                    {catalog?.statistic.frames || '---'}
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
                                    {catalog?.statistic?.data_size
                                        ? `${size} Гб`
                                        : '---'}
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
                                {catalog?.source_link && (
                                    <div>
                                        <span className={styles.value}>
                                            Исходные данные (FITS):
                                        </span>
                                        <a
                                            href={catalog?.source_link}
                                            rel={'nofollow noreferrer'}
                                            target={'_blank'}
                                            title={`Ссылка на скачивание исходных данных телескопа (FITS) для ${catalog.name}`}
                                            className={styles.downloadLink}
                                        >
                                            <Icon name={'download'} />
                                            СКАЧАТЬ
                                        </a>
                                    </div>
                                )}
                            </div>
                        </Grid.Column>
                        <Grid.Column
                            computer={8}
                            tablet={8}
                            mobile={16}
                            className={styles.filterContainer}
                        >
                            <FilterList filters={catalog?.filters} />
                        </Grid.Column>
                    </Grid>
                </Grid.Column>
                <Grid.Column
                    computer={6}
                    tablet={6}
                    mobile={16}
                >
                    <Image
                        src={
                            catalog?.image
                                ? `${hosts.maps}${catalog.image}`
                                : noImageServerUrl
                        }
                        className={styles.celestialMapImage}
                        width={395}
                        height={200}
                        alt={`${title} - Расположение на астрономической карте`}
                        priority={true}
                    />
                </Grid.Column>
            </Grid>
        </div>
    )
}

export default ObjectSection
