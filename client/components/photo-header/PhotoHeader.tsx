import { ApiModel } from '@/api'
import { getTimeFromSec } from '@/functions/helpers'
import { formatDate } from '@/tools/dates'
import { createLargePhotoUrl } from '@/tools/photos'
import { formatObjectName, humanizeFileSize } from '@/tools/strings'
import { useTranslation } from 'next-i18next'
import Image from 'next/image'
import Link from 'next/link'
import React, { useMemo } from 'react'
import { Container } from 'simple-react-ui-kit'

import FilterList from '@/components/filter-list'
import StarMap from '@/components/star-map'

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
    const { t } = useTranslation()

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
                    {props.date ? formatDate(props.date, 'DD MMM YYYY') : '---'}
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>Общее накопление:</span>
                    {props.statistic?.exposure
                        ? getTimeFromSec(props.statistic.exposure, true)
                        : '---'}
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>Количество кадров:</span>
                    {props.statistic?.frames ?? '---'}
                </div>

                {props.imageHeight && props.imageWidth && (
                    <div className={styles.item}>
                        <span className={styles.key}>Размер фотографии:</span>
                        {`${props.imageWidth}x${props.imageHeight}px`}
                    </div>
                )}

                <div className={styles.item}>
                    <span className={styles.key}>Размер файла:</span>
                    {props.fileSize ? humanizeFileSize(props.fileSize) : '---'}
                </div>

                {objectsData?.length && (
                    <div className={styles.item}>
                        <span className={styles.key}>Объекты на фото:</span>
                        {objectsData.map(({ name }) => (
                            <Link
                                key={name}
                                href={`/objects/${name}`}
                                className={styles.objectLink}
                                title={''}
                            >
                                {formatObjectName(name)}
                            </Link>
                        ))}
                    </div>
                )}

                {!!Object.values(props.filters ?? {})?.length && (
                    <div className={styles.filterList}>
                        <FilterList filters={props.filters} />
                    </div>
                )}

                {equipmentsData?.length && (
                    <div className={styles.equipmentList}>
                        {equipmentsData.map((item) => (
                            <div
                                key={item.id}
                                className={styles.item}
                            >
                                <span className={styles.key}>
                                    {t(`${item.type}`)}
                                </span>
                                {item.brand} {item.model}
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.starMapSection}>
                    <StarMap
                        zoom={14}
                        objects={objectsData}
                    />
                </div>
            </div>
        </Container>
    )
}

export default PhotoHeader
