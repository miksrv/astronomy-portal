import React, { useEffect, useMemo, useState } from 'react'
import { Container, Skeleton } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { PhotoFilterList, PhotoLightbox, StarMap } from '@/components/common'
import { formatDate } from '@/utils/dates'
import { getTimeFromSec } from '@/utils/helpers'
import { createLargePhotoUrl, createMediumPhotoUrl } from '@/utils/photos'
import { formatObjectName, humanizeFileSize } from '@/utils/strings'

import styles from './styles.module.sass'

interface ObjectHeaderProps extends Partial<ApiModel.Photo> {
    photoTitle?: string
    objectsList?: ApiModel.Object[]
    categoriesList?: ApiModel.Category[]
    equipmentsList?: ApiModel.Equipment[]
    loading?: boolean
}

export const PhotoHeader: React.FC<ObjectHeaderProps> = ({
    photoTitle,
    objectsList,
    categoriesList,
    equipmentsList,
    ...props
}) => {
    const { t } = useTranslation()

    const [loading, setLoading] = useState<boolean>(false)
    const [imageSource, setImageSource] = useState<string>('')
    const [showLightbox, setShowLightbox] = useState<boolean>(false)

    const objectsData = useMemo(
        () => objectsList?.filter(({ name }) => props.objects?.includes(name)),
        [objectsList, props.objects]
    )

    const categoriesData = useMemo(
        () => categoriesList?.filter(({ id }) => props.categories?.includes(id)),
        [categoriesList, props.categories]
    )

    const equipmentsData = useMemo(
        () => equipmentsList?.filter(({ id }) => props.equipments?.includes(id)),
        [equipmentsList, props.equipments]
    )

    const getEquipmentTypeMap = (type?: ApiModel.EquipmentType): string => {
        switch (type) {
            case ApiModel.EquipmentType.Mount:
                return t('equipment.mount', 'Монтировка')
            case ApiModel.EquipmentType.Scope:
                return t('equipment.scope', 'Телескоп')
            case ApiModel.EquipmentType.Camera:
                return t('equipment.camera', 'Камера')
            case ApiModel.EquipmentType.GuidingCamera:
                return t('equipment.guiding_camera', 'Гидирующая камера')
            case ApiModel.EquipmentType.GuidingScope:
                return t('equipment.guiding_scope', 'Гидирующий телескоп')
            case ApiModel.EquipmentType.Focuser:
                return t('equipment.focuser', 'Фокусер')
            case ApiModel.EquipmentType.FilterWheel:
                return t('equipment.filter_wheel', 'Колесо фильтров')
            case ApiModel.EquipmentType.Filter:
                return t('equipment.filter', 'Фильтр')
            case undefined: {
                throw new Error('Not implemented yet: undefined case')
            }
        }
    }

    useEffect(() => {
        if (props?.fileName) {
            setLoading(true)
            const newImage = new window.Image()
            newImage.src = createLargePhotoUrl(props as ApiModel.Photo)
            newImage.onload = () => {
                setImageSource(newImage.src)
                setLoading(false)
            }
        }
    }, [props?.fileName])

    return (
        <Container className={styles.photoContainer}>
            <div className={styles.imageSection}>
                <button
                    tabIndex={0}
                    className={styles.lightboxTrigger}
                    onClick={() => setShowLightbox(true)}
                    style={{
                        backgroundImage: `url(${createMediumPhotoUrl(props as ApiModel.Photo)})`
                    }}
                >
                    {!loading ? (
                        <Image
                            className={styles.image}
                            alt={photoTitle || ''}
                            src={imageSource}
                            fill={true}
                        />
                    ) : (
                        <Skeleton style={{ width: '100%', height: '100%' }} />
                    )}
                </button>
            </div>
            <div className={styles.parametersSection}>
                <div className={styles.starMapSection}>
                    <StarMap
                        zoom={5}
                        objects={objectsData}
                    />
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>
                        {t('components.pages.photos.photo-header.category', 'Категория')}:
                    </span>
                    <div>
                        {!categoriesData?.length
                            ? '---'
                            : categoriesData?.map(({ title, id }, i) => (
                                  <>
                                      <Link
                                          key={`category_${id}`}
                                          href={`/photos?category=${id}`}
                                          title={`${t('components.pages.photos.photo-header.astrophoto', 'Астрофото')}: {title}`}
                                      >
                                          {title}
                                      </Link>
                                      {i < categoriesData.length - 1 && ', '}
                                  </>
                              ))}
                    </div>
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>{t('components.pages.photos.photo-header.date', 'Дата ')}:</span>
                    {props.date ? formatDate(props.date, 'DD MMM YYYY') : '---'}
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>
                        {t('components.pages.photos.photo-header.total-exposure', 'Общая выдержка')}:
                    </span>
                    {props.statistic?.exposure ? getTimeFromSec(props.statistic.exposure, true) : '---'}
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>
                        {t('components.pages.photos.photo-header.number-of-frames', 'Количество кадров')}
                        {':'}
                    </span>
                    {props.statistic?.frames ?? '---'}
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>
                        {t('components.pages.photos.photo-header.file-size', 'Размер файла')}:
                    </span>
                    {props.fileSize ? humanizeFileSize(props.fileSize) : '---'}
                </div>

                {objectsData?.length && (
                    <div className={styles.item}>
                        <span className={styles.key}>
                            {t('components.pages.photos.photo-header.objects-on-photo', 'Объекты на фото')}
                            {':'}
                        </span>
                        {objectsData.map(({ name, title }) => (
                            <Link
                                key={name}
                                href={`/objects/${name}`}
                                className={styles.objectLink}
                                title={title}
                            >
                                {formatObjectName(name)}
                            </Link>
                        ))}
                    </div>
                )}

                {!!Object.values(props.filters ?? {})?.length && (
                    <div className={styles.filterList}>
                        <PhotoFilterList filters={props.filters} />
                    </div>
                )}

                {!!equipmentsData?.length && (
                    <div className={styles.equipmentList}>
                        {equipmentsData.map((item) => (
                            <div
                                key={item.id}
                                className={styles.item}
                            >
                                <span className={styles.key}>
                                    {getEquipmentTypeMap(item.type)}
                                    {':'}
                                </span>
                                {item.brand} {item.model}
                            </div>
                        ))}
                    </div>
                )}

                <Link
                    className={styles.fullPhotoButton}
                    href={`${hosts.photo}${props.dirName}/${props.fileName}.${props?.fileExt}`}
                    title={t(
                        'components.pages.photos.photo-header.open-full-size',
                        '{{photoName}} - Открыть в полном размере',
                        {
                            photoName: photoTitle
                        }
                    )}
                    target={'_blank'}
                >
                    {t('components.pages.photos.photo-header.full-size', 'Открыть полный размер ({{size}})', {
                        size: humanizeFileSize(props?.fileSize || 0)
                    })}
                </Link>
            </div>

            <PhotoLightbox
                photos={[
                    {
                        src: createLargePhotoUrl(props as ApiModel.Photo),
                        width: props.imageWidth || 1280,
                        height: props.imageHeight || 1024,
                        title: photoTitle || ''
                    }
                ]}
                showLightbox={showLightbox}
                onCloseLightBox={() => setShowLightbox(false)}
            />
        </Container>
    )
}
