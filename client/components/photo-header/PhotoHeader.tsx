import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { formatDate } from '@/tools/dates'
import { getTimeFromSec } from '@/tools/helpers'
import { createLargePhotoUrl, createMediumPhotoUrl } from '@/tools/photos'
import { formatObjectName, humanizeFileSize } from '@/tools/strings'
import { useTranslation } from 'next-i18next'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'
import { Container, Skeleton } from 'simple-react-ui-kit'

import FilterList from '@/components/filter-list'
import PhotoLightbox from '@/components/photo-lightbox'
import StarMap from '@/components/star-map'

import styles from './styles.module.sass'

interface ObjectHeaderProps extends Partial<ApiModel.Photo> {
    photoTitle?: string
    objectsList?: ApiModel.Object[]
    categoriesList?: ApiModel.Category[]
    equipmentsList?: ApiModel.Equipment[]
    loading?: boolean
}

const PhotoHeader: React.FC<ObjectHeaderProps> = ({
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
        () =>
            categoriesList?.filter(({ id }) => props.categories?.includes(id)),
        [categoriesList, props.categories]
    )

    const equipmentsData = useMemo(
        () =>
            equipmentsList?.filter(({ id }) => props.equipments?.includes(id)),
        [equipmentsList, props.equipments]
    )

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
                        backgroundImage: `url(${createMediumPhotoUrl(
                            props as ApiModel.Photo
                        )})`
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
                    <span className={styles.key}>{t('category')}:</span>
                    {!categoriesData?.length
                        ? '---'
                        : categoriesData?.map(({ title }) => title).join(', ')}
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>{t('date')}:</span>
                    {props.date ? formatDate(props.date, 'DD MMM YYYY') : '---'}
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>{t('total-exposure')}:</span>
                    {props.statistic?.exposure
                        ? getTimeFromSec(props.statistic.exposure, true)
                        : '---'}
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>{t('number-of-frames')}:</span>
                    {props.statistic?.frames ?? '---'}
                </div>

                <div className={styles.item}>
                    <span className={styles.key}>{t('file-size')}:</span>
                    {props.fileSize ? humanizeFileSize(props.fileSize) : '---'}
                </div>

                {objectsData?.length && (
                    <div className={styles.item}>
                        <span className={styles.key}>
                            {t('objects-in-photo')}:
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
                        <FilterList filters={props.filters} />
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
                                    {t(`equipment.${item.type}`)}
                                </span>
                                {item.brand} {item.model}
                            </div>
                        ))}
                    </div>
                )}

                <Link
                    className={styles.fullPhotoButton}
                    href={`${hosts.photo}${props.dirName}/${props.fileName}.${props?.fileExt}`}
                    title={t('open-full-size', { photoName: photoTitle })}
                    target={'_blank'}
                >
                    {t('full-size', {
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

export default PhotoHeader
