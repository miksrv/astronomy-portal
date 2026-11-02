import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, cn, Input, Select } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { ChipGroup, SegmentedControl } from '@/components/ui'
import { getObjectStatus } from '@/utils/objects'

import { useObjectStatusLabels } from '../object-status-badge'

import { DEFAULT_DIRECTION } from './constants'
import { ObjectRow } from './ObjectRow'
import { CatalogFilters, CatalogObject, CatalogSort, CatalogStatus, CatalogVisibility } from './types'
import { filterCatalog } from './utils'

import styles from './styles.module.sass'

const SEARCH_INPUT_ID = 'objects-catalog-search'

interface ObjectsCatalogProps {
    objects: CatalogObject[]
    categories: ApiModel.Category[]
    filters: CatalogFilters
    /** Tonight's visibility, once computed on the client */
    visibility?: CatalogVisibility
    onChange: (patch: Partial<CatalogFilters>) => void
    onReset: () => void
}

/**
 * The catalog as a sortable list: a sticky toolbar (search, "visible tonight", sort, status
 * and categories) over one row per object. The whole row is the object's link.
 */
export const ObjectsCatalog: React.FC<ObjectsCatalogProps> = ({
    objects,
    categories,
    filters,
    visibility,
    onChange,
    onReset
}) => {
    const { t } = useTranslation()
    const statusLabels = useObjectStatusLabels()

    const sentinelRef = useRef<HTMLDivElement>(null)
    const [stuck, setStuck] = useState(false)

    const list = useMemo(() => filterCatalog(objects, filters, visibility), [objects, filters, visibility])

    const categoryTitles = useMemo(
        () => Object.fromEntries(categories.map(({ id, title }) => [id, title])),
        [categories]
    )

    // Only the categories the catalog has objects in, the biggest first
    const categoryOptions = useMemo(() => {
        const counts: Record<number, number> = {}

        objects.forEach(({ categories }) => categories.forEach((id) => (counts[id] = (counts[id] ?? 0) + 1)))

        return [
            { key: 0, label: t('components.pages.objects.objects-catalog.all-categories', 'Все категории') },
            ...categories
                .filter(({ id }) => counts[id])
                .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
                .map(({ id, title }) => ({ key: id, label: title, count: counts[id] }))
        ]
    }, [objects, categories, t])

    const statusOptions = useMemo(() => {
        const count = (status: CatalogStatus) => objects.filter((object) => getObjectStatus(object) === status).length

        return [
            {
                key: 'all' as const,
                label: t('components.pages.objects.objects-catalog.all', 'Все'),
                count: objects.length
            },
            { key: 'photo' as const, label: statusLabels.photo, count: count('photo') },
            { key: 'frames' as const, label: statusLabels.frames, count: count('frames') },
            { key: 'none' as const, label: statusLabels.none, count: count('none') }
        ]
    }, [objects, t, statusLabels])

    const sortOptions: Array<{ key: CatalogSort; value: string }> = [
        { key: 'name', value: t('components.pages.objects.objects-catalog.sort-name', 'По названию') },
        { key: 'exposure', value: t('components.pages.objects.objects-catalog.sort-exposure', 'По выдержке') },
        { key: 'frames', value: t('components.pages.objects.objects-catalog.sort-frames', 'По числу кадров') },
        { key: 'nights', value: t('components.pages.objects.objects-catalog.sort-nights', 'По числу ночей') },
        { key: 'last', value: t('components.pages.objects.objects-catalog.sort-last', 'По дате съёмки') },
        { key: 'visibility', value: t('components.pages.objects.objects-catalog.sort-visibility', 'По высоте сегодня') }
    ]

    const columns: Array<{ key?: CatalogSort; label: string; className?: string; right?: boolean }> = [
        { key: 'name', label: t('components.pages.objects.objects-catalog.column-object', 'Объект') },
        { label: t('components.pages.objects.objects-catalog.column-status', 'Статус'), className: styles.cellStatus },
        {
            key: 'exposure',
            label: t('components.pages.objects.objects-catalog.column-exposure', 'Выдержка по фильтрам'),
            className: styles.cellExposure
        },
        {
            key: 'frames',
            label: t('components.pages.objects.objects-catalog.column-frames', 'Кадры'),
            className: styles.cellFrames,
            right: true
        },
        {
            key: 'nights',
            label: t('components.pages.objects.objects-catalog.column-nights', 'Ночей'),
            className: styles.cellNights,
            right: true
        },
        {
            key: 'last',
            label: t('components.pages.objects.objects-catalog.column-last', 'Последняя'),
            className: styles.cellLast,
            right: true
        },
        {
            key: 'visibility',
            label: t('components.pages.objects.objects-catalog.column-tonight', 'Сегодня'),
            className: styles.cellVisibility,
            right: true
        }
    ]

    const handleSort = (sort: CatalogSort) =>
        onChange(
            filters.sort === sort
                ? { direction: filters.direction === 'asc' ? 'desc' : 'asc' }
                : { sort, direction: DEFAULT_DIRECTION[sort] }
        )

    const handleVisibleOnly = () =>
        onChange(
            filters.visibleOnly
                ? { visibleOnly: false }
                : { visibleOnly: true, sort: 'visibility', direction: DEFAULT_DIRECTION.visibility }
        )

    // A shadow under the toolbar once it sticks to the header
    useEffect(() => {
        const sentinel = sentinelRef.current

        if (!sentinel) {
            return
        }

        const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'))
        const observer = new IntersectionObserver(([entry]) => setStuck(!(entry?.isIntersecting ?? true)), {
            rootMargin: `-${(headerHeight || 50) + 1}px 0px 0px 0px`
        })

        observer.observe(sentinel)

        return () => observer.disconnect()
    }, [])

    // "/" jumps to the search, Escape in it clears it
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement
            const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable

            if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault()
                document.getElementById(SEARCH_INPUT_ID)?.focus()
            }

            if (event.key === 'Escape' && target.id === SEARCH_INPUT_ID) {
                onChange({ search: '' })
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onChange])

    const filtered = list.length !== objects.length

    return (
        <>
            <div
                ref={sentinelRef}
                className={styles.sentinel}
            />
            <div className={cn(styles.toolbar, stuck && styles.stuck)}>
                <div className={styles.toolbarRow}>
                    <Input
                        id={SEARCH_INPUT_ID}
                        className={styles.search}
                        type={'search'}
                        icon={'Search'}
                        size={'medium'}
                        clearable={true}
                        autoComplete={'off'}
                        value={filters.search}
                        aria-label={t('components.pages.objects.objects-catalog.search-label', 'Поиск по названию')}
                        placeholder={t(
                            'components.pages.objects.objects-catalog.search-placeholder',
                            'M31, NGC 7000, туманность…'
                        )}
                        onChange={(event) => onChange({ search: event.target.value })}
                    />
                    <Button
                        mode={'secondary'}
                        icon={'Eye'}
                        className={cn(styles.visibleToggle, filters.visibleOnly && styles.pressed)}
                        aria-pressed={filters.visibleOnly}
                        label={t('components.pages.objects.objects-catalog.visible-tonight', 'Видно сегодня')}
                        onClick={handleVisibleOnly}
                    />
                    <Select<CatalogSort>
                        className={styles.sort}
                        aria-label={t('components.pages.objects.objects-catalog.sort-label', 'Сортировка')}
                        value={filters.sort}
                        options={sortOptions}
                        onSelect={(selected) => {
                            const sort = selected?.[0]?.key

                            if (sort) {
                                onChange({ sort, direction: DEFAULT_DIRECTION[sort] })
                            }
                        }}
                    />
                </div>
                <div className={styles.toolbarRow}>
                    <SegmentedControl<CatalogStatus>
                        aria-label={t('components.pages.objects.objects-catalog.status-label', 'Статус')}
                        options={statusOptions}
                        value={filters.status}
                        onChange={(status) => onChange({ status })}
                    />
                    <ChipGroup<number>
                        className={styles.chips}
                        aria-label={t('components.pages.objects.objects-catalog.categories-label', 'Категории')}
                        options={categoryOptions}
                        value={filters.category ?? 0}
                        onChange={(category) => onChange({ category: category || undefined })}
                    />
                </div>
            </div>

            <div
                role={'table'}
                aria-label={t('components.pages.objects.objects-catalog.table-label', 'Объекты')}
                aria-rowcount={list.length + 1}
                className={styles.list}
            >
                {!!list.length && (
                    <div
                        role={'row'}
                        className={cn(styles.row, styles.head)}
                    >
                        {columns.map((column) => {
                            const active = column.key === filters.sort

                            return (
                                <div
                                    key={column.label}
                                    role={'columnheader'}
                                    className={cn(column.className, column.right && styles.right)}
                                    aria-sort={
                                        active ? (filters.direction === 'asc' ? 'ascending' : 'descending') : undefined
                                    }
                                >
                                    {column.key ? (
                                        <Button
                                            unstyled={true}
                                            className={cn(styles.sortButton, active && styles.active)}
                                            onClick={() => handleSort(column.key as CatalogSort)}
                                        >
                                            {column.label}
                                            <span
                                                className={styles.arrow}
                                                aria-hidden={'true'}
                                            >
                                                {active && filters.direction === 'asc' ? '▲' : '▼'}
                                            </span>
                                        </Button>
                                    ) : (
                                        column.label
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                <div role={'rowgroup'}>
                    {list.map((object) => (
                        <ObjectRow
                            key={object.name}
                            object={object}
                            computed={!!visibility}
                            visibility={visibility?.[object.name]}
                            categoryTitles={object.categories.map((id) => categoryTitles[id]).join(', ')}
                        />
                    ))}
                </div>

                {!list.length && (
                    <div className={styles.empty}>
                        <p>
                            {t(
                                'components.pages.objects.objects-catalog.not-found',
                                'По вашему запросу ничего не найдено.'
                            )}
                        </p>
                        <Button
                            mode={'secondary'}
                            label={t('components.pages.objects.objects-catalog.reset-filters', 'Сбросить фильтры')}
                            onClick={onReset}
                        />
                    </div>
                )}
            </div>

            <div className={styles.resultLine}>
                <span>
                    <span aria-live={'polite'}>
                        {filtered
                            ? t('components.pages.objects.objects-catalog.found', 'Найдено {{found}} из {{total}}', {
                                  found: list.length,
                                  total: objects.length
                              })
                            : t('components.pages.objects.objects-catalog.objects-count', '{{count}} объектов', {
                                  count: objects.length
                              })}
                    </span>
                    {filtered && (
                        <>
                            {' · '}
                            <Button
                                mode={'link'}
                                size={'small'}
                                className={styles.resetLink}
                                label={t('components.pages.objects.objects-catalog.reset', 'Сбросить')}
                                onClick={onReset}
                            />
                        </>
                    )}
                </span>
                <span>
                    {t(
                        'components.pages.objects.objects-catalog.visibility-note',
                        'Видимость — максимальная высота при Солнце ниже −12°, Оренбург'
                    )}
                </span>
            </div>
        </>
    )
}
