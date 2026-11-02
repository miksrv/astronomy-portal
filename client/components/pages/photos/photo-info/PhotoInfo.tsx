import React from 'react'
import { Button } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { FilterTag } from '@/components/common/filter-tag'
import { formatExposure } from '@/utils/dates'
import { getFilterExposures } from '@/utils/filters'
import { humanizeFileSize } from '@/utils/strings'

import styles from './styles.module.sass'

interface PhotoInfoProps {
    photo: ApiModel.Photo
    categories: ApiModel.Category[]
    /** The URL of the original file */
    original: string
}

/**
 * The label under the picture, the way a museum hangs one next to a work (its title is the page
 * header over the picture): in which filters the light was collected, where the picture belongs,
 * and the way to the original file. One line on wide screens however many filters there are; when
 * and with what it was taken is a section of its own below.
 */
export const PhotoInfo: React.FC<PhotoInfoProps> = ({ photo, categories, original }) => {
    const { t } = useTranslation()

    const filters = getFilterExposures(photo.filters)

    return (
        <div className={styles.photoInfo}>
            <dl className={styles.facts}>
                {!!filters.length && (
                    <div className={styles.filters}>
                        <dt>{t('components.pages.photos.photo-info.filters', 'Фильтры')}</dt>
                        <dd>
                            {filters.map(({ filter, exposure: filterExposure }) => (
                                <FilterTag
                                    key={filter}
                                    filter={filter}
                                >
                                    <span className={styles.filterExposure}>{formatExposure(filterExposure, t)}</span>
                                </FilterTag>
                            ))}
                        </dd>
                    </div>
                )}
                {!!categories.length && (
                    <div>
                        <dt>{t('components.pages.photos.photo-info.category', 'Категория')}</dt>
                        <dd className={styles.links}>
                            {categories.map(({ id, title: categoryTitle }) => (
                                <Link
                                    key={id}
                                    href={`/photos?category=${id}`}
                                    title={t(
                                        'components.pages.photos.photo-info.category-link',
                                        'Все снимки: {{category}}',
                                        { category: categoryTitle }
                                    )}
                                >
                                    {categoryTitle}
                                </Link>
                            ))}
                        </dd>
                    </div>
                )}
            </dl>

            <Button
                mode={'primary'}
                icon={'Download'}
                link={original}
                noIndex={true}
                className={styles.download}
                label={t('components.pages.photos.photo-info.download', 'Полный размер · {{size}}', {
                    size: humanizeFileSize(photo.fileSize ?? 0)
                })}
            />
        </div>
    )
}
