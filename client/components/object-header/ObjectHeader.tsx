import { ApiModel, HOST_IMG } from '@/api'
import { getTimeFromSec } from '@/functions/helpers'
import { humanizeFileSize } from '@/tools/strings'
import { useTranslation } from 'next-i18next'
import Image from 'next/image'
import Link from 'next/link'
import React, { useMemo } from 'react'
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
    const { t } = useTranslation()

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
                        <span className={styles.key}>
                            {t('name-in-the-directory')}:
                        </span>
                        {props.name}
                    </div>

                    {!!categoriesData?.length && (
                        <div className={styles.item}>
                            <span className={styles.key}>{t('category')}:</span>
                            {categoriesData
                                .map(({ title }) => title)
                                .join(', ')}
                        </div>
                    )}

                    <div className={styles.item}>
                        <span className={styles.key}>{t('coordinates')}:</span>
                        {'RA: ' + props.ra + ', DEC: ' + props.dec}
                    </div>

                    {props.statistic?.exposure && (
                        <div className={styles.item}>
                            <span className={styles.key}>
                                {t('total-exposure')}:
                            </span>
                            {getTimeFromSec(props.statistic.exposure, true)}
                        </div>
                    )}

                    {props.statistic?.frames && (
                        <div className={styles.item}>
                            <span className={styles.key}>
                                {t('number-of-frames')}:
                            </span>
                            {props.statistic.frames}
                        </div>
                    )}

                    {!!props.statistic?.fileSize && (
                        <div className={styles.item}>
                            <span className={styles.key}>
                                {t('data-size')}:
                            </span>
                            {humanizeFileSize(props.statistic.fileSize)}
                        </div>
                    )}

                    {props?.fitsCloudLink && (
                        <div className={styles.item}>
                            <span className={styles.key}>
                                {t('link-to-FITS-files')}:
                            </span>
                            <Link
                                href={props?.fitsCloudLink}
                                target={'_blank'}
                                title={''}
                            >
                                {t('download')}
                            </Link>
                        </div>
                    )}
                </div>

                {!!Object.values(props.filters ?? {})?.length && (
                    <div className={styles.filterList}>
                        <FilterList filters={props.filters} />
                    </div>
                )}

                <Image
                    src={
                        props?.image
                            ? `${HOST_IMG}${props.image}`
                            : noImageServerUrl
                    }
                    className={styles.starMapImage}
                    width={395}
                    height={182}
                    alt={`${props.title} - ${t(
                        'location-on-the-astronomical-map'
                    )}`}
                    priority={true}
                />
            </div>
        </Container>
    )
}

export default ObjectHeader
