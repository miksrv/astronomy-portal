import { ApiModel, useAppDispatch, useAppSelector } from '@/api'
import { editCatalog, openFormCatalog } from '@/api/applicationSlice'
import { hosts } from '@/api/constants'
import { formatDate, getTimeFromSec } from '@/functions/helpers'
import classNames from 'classnames'
import uniq from 'lodash-es/uniq'
import Image from 'next/image'
import React, { useMemo } from 'react'
import { Grid, Icon } from 'semantic-ui-react'
import { Container } from 'simple-react-ui-kit'

import FilterList from '@/components/filter-list'

import noImageServerUrl from '@/public/images/no-photo.png'

import styles from './styles.module.sass'

interface ObjectHeaderProps extends Partial<ApiModel.Object> {
    categoriesList?: ApiModel.Category[]
    loading?: boolean
}

const ObjectHeader: React.FC<ObjectHeaderProps> = ({
    categoriesList,
    ...props
}) => {
    // const dispatch = useAppDispatch()
    // const user = useAppSelector((state) => state.auth.user)
    //
    // const date = catalog?.updated ? formatDate(catalog.updated) : '---'
    // const exposure = catalog?.statistic?.exposure
    //     ? getTimeFromSec(catalog.statistic.exposure, true)
    //     : '---'
    // const size = catalog?.statistic?.data_size
    //     ? Math.round((catalog.statistic.data_size / 1024) * 100) / 100
    //     : undefined
    //
    // const handleEditCatalog = () => {
    //     dispatch(editCatalog(catalog))
    //     dispatch(openFormCatalog(true))
    // }

    const categoriesData = useMemo(
        () =>
            categoriesList?.filter(({ id }) => props.categories?.includes(id)),
        [categoriesList, props.categories]
    )

    return (
        <Container className={styles.objectContainer}>
            <div className={styles.infoContainer}>
                <div className={styles.parameters}>
                    <div className={styles.item}>
                        <span className={styles.key}>Имя в каталоге:</span>
                        {props.name ?? '---'}
                    </div>
                    <div className={styles.item}>
                        <span className={styles.key}>Категория:</span>
                        {!categoriesData?.length
                            ? '---'
                            : categoriesData
                                  ?.map(({ title }) => title)
                                  .join(', ')}
                    </div>
                    <div className={styles.item}>
                        <span className={styles.key}>Координаты:</span>
                        {'RA: ' + props.ra + ', DEC: ' + props.dec}
                    </div>
                    <div className={styles.item}>
                        <span className={styles.key}>Количество кадров:</span>
                        {props.statistic?.frames ?? '---'}
                    </div>
                    <div className={styles.item}>
                        <span className={styles.key}>Общее накопление:</span>
                        {props.statistic?.exposure ?? '---'}
                    </div>
                    <div className={styles.item}>
                        <span className={styles.key}>Размер данных:</span>
                        {props.statistic?.exposure ?? '---'}
                    </div>
                </div>

                {!!Object.values(props.filters ?? {})?.length && (
                    <div className={styles.filterList}>
                        <FilterList filters={props.filters} />
                    </div>
                )}
            </div>
            <div className={styles.mapImageContainer}>
                {/*<Image*/}
                {/*    src={*/}
                {/*        catalog?.image*/}
                {/*            ? `${hosts.maps}${catalog.image}`*/}
                {/*            : noImageServerUrl*/}
                {/*    }*/}
                {/*    className={styles.celestialMapImage}*/}
                {/*    width={395}*/}
                {/*    height={182}*/}
                {/*    alt={`${title} - Расположение на астрономической карте`}*/}
                {/*    priority={true}*/}
                {/*/>*/}
            </div>
        </Container>

        // <div className={classNames(styles.section, 'box')}>
        //     <Grid>
        //         <Grid.Column
        //             computer={10}
        //             tablet={10}
        //             mobile={16}
        //         >
        //             <h1>
        //                 {title}
        //                 {user?.role === 'admin' && (
        //                     <span
        //                         className={styles.controlButton}
        //                         role={'button'}
        //                         tabIndex={0}
        //                         onKeyUp={() => {}}
        //                         onClick={handleEditCatalog}
        //                     >
        //                         <Icon name={'edit outline'} />
        //                     </span>
        //                 )}
        //             </h1>
        //             <Grid>
        //                 <Grid.Column
        //                     computer={8}
        //                     tablet={8}
        //                     mobile={16}
        //                 >
        //                     <div className={styles.parameters}>
        //                         <div>
        //                             <span className={styles.value}>
        //                                 Категория:
        //                             </span>
        //                             {catalog?.category_name || '---'}
        //                         </div>
        //                         <div>
        //                             <span className={styles.value}>
        //                                 Последний кадр:
        //                             </span>
        //                             {date}
        //                         </div>
        //                         <div>
        //                             <span className={styles.value}>
        //                                 Сделано кадров:
        //                             </span>
        //                             {catalog?.statistic?.frames || '---'}
        //                         </div>
        //                         <div>
        //                             <span className={styles.value}>
        //                                 Общая выдержка:
        //                             </span>
        //                             {exposure}
        //                         </div>
        //                         <div>
        //                             <span className={styles.value}>
        //                                 Накоплено данных:
        //                             </span>
        //                             {catalog?.statistic?.data_size
        //                                 ? `${size} Гб`
        //                                 : '---'}
        //                         </div>
        //                         <div>
        //                             <span className={styles.value}>
        //                                 Отклонение (RA / DEC):
        //                             </span>
        //                             {deviationRa} / {deviationDec}
        //                         </div>
        //                         <div>
        //                             <span className={styles.value}>
        //                                 Координаты:
        //                             </span>
        //                             RA: {catalog?.coord_ra}, DEC:{' '}
        //                             {catalog?.coord_dec}
        //                         </div>
        //                         {catalog?.source_link && (
        //                             <div>
        //                                 <span className={styles.value}>
        //                                     Исходные данные (FITS):
        //                                 </span>
        //                                 <a
        //                                     href={catalog?.source_link}
        //                                     rel={'nofollow noreferrer'}
        //                                     target={'_blank'}
        //                                     title={`Ссылка на скачивание исходных данных телескопа (FITS) для ${catalog.name}`}
        //                                     className={styles.downloadLink}
        //                                 >
        //                                     <Icon name={'download'} />
        //                                     СКАЧАТЬ
        //                                 </a>
        //                             </div>
        //                         )}
        //                     </div>
        //                 </Grid.Column>
        //                 <Grid.Column
        //                     computer={8}
        //                     tablet={8}
        //                     mobile={16}
        //                     className={styles.filterContainer}
        //                 >
        //                     <FilterList filters={catalog?.filters} />
        //                 </Grid.Column>
        //             </Grid>
        //         </Grid.Column>
        //         <Grid.Column
        //             computer={6}
        //             tablet={6}
        //             mobile={16}
        //         >
        //             <Image
        //                 src={
        //                     catalog?.image
        //                         ? `${hosts.maps}${catalog.image}`
        //                         : noImageServerUrl
        //                 }
        //                 className={styles.celestialMapImage}
        //                 width={395}
        //                 height={182}
        //                 alt={`${title} - Расположение на астрономической карте`}
        //                 priority={true}
        //             />
        //         </Grid.Column>
        //     </Grid>
        // </div>
    )
}

export default ObjectHeader
