import React, { useDeferredValue, useMemo, useState } from 'react'
import { Button, Input } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { ChipGroup, SegmentedControl } from '@/components/ui'

import { EAGER_PHOTOS_COUNT, PHOTOS_PAGE_SIZE } from './constants'
import { PhotoTile } from './PhotoTile'
import { GalleryFilters, GalleryPhotoItem, GallerySort } from './types'
import { filterGallery } from './utils'

import styles from './styles.module.sass'

interface PhotoCatalogProps {
    photos: GalleryPhotoItem[]
    categories: ApiModel.Category[]
    filters: GalleryFilters
    onChange: (patch: Partial<GalleryFilters>) => void
    onReset: () => void
}

/** The photo catalog: a toolbar (search, sort, categories) over a grid of photo tiles */
export const PhotoCatalog: React.FC<PhotoCatalogProps> = ({ photos, categories, filters, onChange, onReset }) => {
    const { t } = useTranslation()

    // Typing stays responsive: the grid follows the filters a beat later, as a low-priority update
    const deferredFilters = useDeferredValue(filters)
    const list = useMemo(() => filterGallery(photos, deferredFilters), [photos, deferredFilters])

    // Only a page of tiles is rendered (and server-rendered) at a time; a change of filters
    // starts over from the first page - adjusted during render, not in an effect
    const [visibleCount, setVisibleCount] = useState(PHOTOS_PAGE_SIZE)
    const [pagedFilters, setPagedFilters] = useState(deferredFilters)

    if (pagedFilters !== deferredFilters) {
        setPagedFilters(deferredFilters)
        setVisibleCount(PHOTOS_PAGE_SIZE)
    }

    const visible = list.slice(0, visibleCount)
    const hiddenCount = list.length - visible.length

    // Only the categories with photos, the biggest first
    const categoryOptions = useMemo(() => {
        const counts: Record<number, number> = {}

        photos.forEach(({ categories }) => categories.forEach((id) => (counts[id] = (counts[id] ?? 0) + 1)))

        return [
            { key: 0, label: t('components.pages.photos.photo-catalog.all-categories', 'Все категории') },
            ...categories
                .filter(({ id }) => counts[id])
                .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
                .map(({ id, title }) => ({ key: id, label: title, count: counts[id] }))
        ]
    }, [photos, categories, t])

    const sortOptions: Array<{ key: GallerySort; label: string }> = [
        { key: 'date', label: t('components.pages.photos.photo-catalog.sort-date', 'Новые') },
        { key: 'exposure', label: t('components.pages.photos.photo-catalog.sort-exposure', 'По выдержке') },
        { key: 'views', label: t('components.pages.photos.photo-catalog.sort-views', 'Популярные') }
    ]

    const filtered = list.length !== photos.length

    return (
        <>
            <div className={styles.toolbar}>
                <div className={styles.toolbarRow}>
                    <Input
                        className={styles.search}
                        type={'search'}
                        icon={'Search'}
                        size={'medium'}
                        clearable={true}
                        autoComplete={'off'}
                        value={filters.search}
                        aria-label={t('components.pages.photos.photo-catalog.search-label', 'Поиск по объекту')}
                        placeholder={t(
                            'components.pages.photos.photo-catalog.search-placeholder',
                            'M31, NGC 7000, туманность…'
                        )}
                        onChange={(event) => onChange({ search: event.target.value })}
                    />
                    <SegmentedControl<GallerySort>
                        aria-label={t('components.pages.photos.photo-catalog.sort-label', 'Сортировка')}
                        options={sortOptions}
                        value={filters.sort}
                        onChange={(sort) => onChange({ sort })}
                    />
                </div>
                <ChipGroup<number>
                    aria-label={t('components.pages.photos.photo-catalog.categories-label', 'Категории')}
                    options={categoryOptions}
                    value={filters.category ?? 0}
                    onChange={(category) => onChange({ category: category || undefined })}
                />
            </div>

            {list.length ? (
                <ul
                    className={styles.grid}
                    aria-label={t('components.pages.photos.photo-catalog.grid-label', 'Снимки')}
                >
                    {visible.map((photo, index) => (
                        <li key={photo.id}>
                            <PhotoTile
                                photo={photo}
                                priority={index === 0 ? 'preload' : index < EAGER_PHOTOS_COUNT ? 'eager' : 'lazy'}
                            />
                        </li>
                    ))}
                </ul>
            ) : (
                <div className={styles.empty}>
                    <p>
                        {t('components.pages.photos.photo-catalog.not-found', 'По вашему запросу ничего не найдено.')}
                    </p>
                    <Button
                        mode={'secondary'}
                        label={t('components.pages.photos.photo-catalog.reset-filters', 'Сбросить фильтры')}
                        onClick={onReset}
                    />
                </div>
            )}

            {hiddenCount > 0 && (
                <div className={styles.showMore}>
                    <Button
                        mode={'secondary'}
                        stretched={true}
                        label={t('components.pages.photos.photo-catalog.show-more', 'Показать ещё {{count}}', {
                            count: Math.min(hiddenCount, PHOTOS_PAGE_SIZE)
                        })}
                        onClick={() => setVisibleCount(visibleCount + PHOTOS_PAGE_SIZE)}
                    />
                </div>
            )}

            {/* Only for a search or a category: how much of the archive it left, and the way back */}
            <div
                className={styles.resultLine}
                aria-live={'polite'}
            >
                {filtered && (
                    <>
                        <span>
                            {t('components.pages.photos.photo-catalog.found', 'Найдено {{found}} из {{total}}', {
                                found: list.length,
                                total: photos.length
                            })}
                        </span>
                        <Button
                            mode={'link'}
                            size={'small'}
                            className={styles.resetLink}
                            label={t('components.pages.photos.photo-catalog.reset', 'Сбросить')}
                            onClick={onReset}
                        />
                    </>
                )}
            </div>
        </>
    )
}
