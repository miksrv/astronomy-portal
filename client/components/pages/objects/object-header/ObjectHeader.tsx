import React, { useMemo } from 'react'
import { Container } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { ApiModel } from '@/api'
import { PhotoFilterList, StarMap } from '@/components/common'
import { formatDEC, formatRA } from '@/utils/coordinates'
import { getTimeFromSec } from '@/utils/helpers'
import { humanizeFileSize } from '@/utils/strings'

import styles from './styles.module.sass'

interface ObjectHeaderProps extends Partial<ApiModel.Object> {
    categoriesList?: ApiModel.Category[]
    loading?: boolean
}

export const ObjectHeader: React.FC<ObjectHeaderProps> = ({ categoriesList, ...props }) => {
    const { t } = useTranslation()

    const categoriesData = useMemo(
        () => categoriesList?.filter(({ id }) => props.categories?.includes(id)),
        [categoriesList, props.categories]
    )

    return (
        <Container className={styles.objectContainer}>
            <div className={styles.parameters}>
                <div className={styles.item}>
                    <span className={styles.key}>
                        {t('components.pages.objects.object-header.name-in-the-directory', {
                            defaultValue: 'Название в каталоге'
                        })}
                        :
                    </span>
                    {props.name}
                </div>

                {!!categoriesData?.length && (
                    <div className={styles.item}>
                        <span className={styles.key}>
                            {t('components.pages.objects.object-header.category', { defaultValue: 'Категория' })}:
                        </span>
                        {categoriesData?.map(({ title, id }, i) => (
                            <>
                                <Link
                                    key={`category_${id}`}
                                    href={`/objects?category=${id}`}
                                    title={`${t('components.pages.objects.object-header.astrophoto', { defaultValue: 'Астрофото' })}: {title}`}
                                >
                                    {title}
                                </Link>
                                {i < categoriesData.length - 1 && ', '}
                            </>
                        ))}
                    </div>
                )}

                {props?.ra && (
                    <div className={styles.item}>
                        <span className={styles.key}>
                            {t('components.pages.objects.object-header.right-ascension', {
                                defaultValue: 'Прямое восхождение'
                            })}
                            :
                        </span>
                        {formatRA(props.ra)}
                    </div>
                )}

                {props?.dec && (
                    <div className={styles.item}>
                        <span className={styles.key}>
                            {t('components.pages.objects.object-header.declination', { defaultValue: 'Склонение' })}:
                        </span>
                        {formatDEC(props.dec)}
                    </div>
                )}

                {props.statistic?.exposure && (
                    <div className={styles.item}>
                        <span className={styles.key}>
                            {t('components.pages.objects.object-header.total-exposure', 'Общее накопление')}:
                        </span>
                        {getTimeFromSec(props.statistic.exposure, true)}
                    </div>
                )}

                {props.statistic?.frames && (
                    <div className={styles.item}>
                        <span className={styles.key}>
                            {t('components.pages.objects.object-header.number-of-frames', {
                                defaultValue: 'Количество кадров'
                            })}
                            :
                        </span>
                        {props.statistic.frames}
                    </div>
                )}

                {!!props.statistic?.fileSize && (
                    <div className={styles.item}>
                        <span className={styles.key}>
                            {t('components.pages.objects.object-header.data-size', { defaultValue: 'Размер данных' })}:
                        </span>
                        {humanizeFileSize(props.statistic.fileSize)}
                    </div>
                )}

                {props?.fitsCloudLink && (
                    <div className={styles.item}>
                        <span className={styles.key}>
                            {t('components.pages.objects.object-header.link-to-fits-files', {
                                defaultValue: 'Ссылка на FITS файлы'
                            })}
                            :
                        </span>
                        <Link
                            href={props?.fitsCloudLink}
                            target={'_blank'}
                            title={''}
                        >
                            {t('components.pages.objects.object-header.download', { defaultValue: 'Скачать' })}
                        </Link>
                    </div>
                )}
            </div>

            {!!Object.values(props.filters ?? {})?.length && (
                <div className={styles.filterList}>
                    <PhotoFilterList filters={props.filters} />
                </div>
            )}

            <div className={styles.starMap}>
                <StarMap
                    zoom={5}
                    objects={[
                        {
                            name: props.name || '',
                            ra: props.ra,
                            dec: props.dec
                        }
                    ]}
                />
            </div>
        </Container>
    )
}
