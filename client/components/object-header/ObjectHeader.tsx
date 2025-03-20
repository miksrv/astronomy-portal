import { ApiModel } from '@/api'
import { formatDEC, formatRA } from '@/tools/coordinates'
import { getTimeFromSec } from '@/tools/helpers'
import { humanizeFileSize } from '@/tools/strings'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import React, { useMemo } from 'react'
import { Container } from 'simple-react-ui-kit'

import FilterList from '@/components/filter-list'
import StarMap from '@/components/star-map'

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
                        {categoriesData?.map(({ title, id }, i) => (
                            <>
                                <Link
                                    key={`category_${id}`}
                                    href={`/objects?category=${id}`}
                                    title={`${t('astrophoto')}: {title}`}
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
                            {t('right-ascension')}:
                        </span>
                        {formatRA(props.ra)}
                    </div>
                )}

                {props?.dec && (
                    <div className={styles.item}>
                        <span className={styles.key}>{t('declination')}:</span>
                        {formatDEC(props.dec)}
                    </div>
                )}

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
                        <span className={styles.key}>{t('data-size')}:</span>
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

export default ObjectHeader
