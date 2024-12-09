import { ApiModel, useAppDispatch, useAppSelector } from '@/api'
import { editCatalog, openFormCatalog } from '@/api/applicationSlice'
import { hosts } from '@/api/constants'
import { formatDate, getTimeFromSec } from '@/functions/helpers'
import { createLargePhotoUrl } from '@/tools/photos'
import { formatObjectName } from '@/tools/strings'
import classNames from 'classnames'
import uniq from 'lodash-es/uniq'
import Image from 'next/image'
import React, { useMemo } from 'react'
import { Grid, Icon } from 'semantic-ui-react'
import { Badge, Container } from 'simple-react-ui-kit'

import FilterList from '@/components/filter-list'

import noImageServerUrl from '@/public/images/no-photo.png'

import styles from './styles.module.sass'

interface ObjectHeaderProps extends Partial<ApiModel.Photo> {
    objectsList?: ApiModel.Object[]
    categoriesList?: ApiModel.Category[]
    equipmentsList?: ApiModel.Equipment[]
    loading?: boolean
}

const PhotoHeader: React.FC<ObjectHeaderProps> = ({
    objectsList,
    categoriesList,
    equipmentsList,
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

    const objectsData = useMemo(
        () => objectsList?.filter(({ name }) => props.objects?.includes(name)),
        [objectsList, props.objects]
    )

    const categoriesData = useMemo(
        () =>
            categoriesList?.filter(({ id }) => props.categories?.includes(id)),
        [categoriesList, props.categories]
    )

    const equipmentsData = useMemo(
        () =>
            equipmentsList?.filter(({ id }) => props.equipments?.includes(id)),
        [equipmentsList, props.equipments]
    )

    return (
        <Container className={styles.photoContainer}>
            <div className={styles.imageSection}>
                <Image
                    className={styles.image}
                    src={createLargePhotoUrl(props as ApiModel.Photo)}
                    fill={true}
                    alt={''}
                />
            </div>
            <div className={styles.parametersSection}>
                <div className={styles.item}>
                    <span className={styles.key}>Категория:</span>
                    {!categoriesData?.length
                        ? '---'
                        : categoriesData?.map(({ title }) => title).join(', ')}
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>Дата снимка:</span>
                    {props.date ?? '---'}
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>Количество кадров:</span>
                    {props.statistic?.frames ?? '---'}
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>Общее накопление:</span>
                    {props.statistic?.exposure ?? '---'}
                </div>

                {props.imageHeight && props.imageWidth && (
                    <div className={styles.item}>
                        <span className={styles.key}>Размер фотографии:</span>
                        {`${props.imageWidth}x${props.imageHeight} px`}
                    </div>
                )}

                <div className={styles.item}>
                    <span className={styles.key}>Размер файла:</span>
                    {props.fileSize ?? '---'}
                </div>

                {objectsData?.length && (
                    <div className={styles.item}>
                        <span className={styles.key}>Объекты на фото:</span>
                        {objectsData?.map(({ name }) => name)?.join(', ')}
                    </div>
                )}

                {equipmentsData?.length && (
                    <div className={styles.item}>
                        <span className={styles.key}>Обордование:</span>
                        {equipmentsData?.map(({ model }) => model)?.join(', ')}
                    </div>
                )}

                {!!Object.values(props.filters ?? {})?.length && (
                    <div className={styles.filterList}>
                        <FilterList filters={props.filters} />
                    </div>
                )}
            </div>
        </Container>
    )
}

export default PhotoHeader
