import React, { useEffect, useId, useRef, useState } from 'react'
import { cn, Input } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel } from '@/api'
import { formatCatalogTitle, getCatalogTypeLabel } from '@/utils/catalog'

import { CATALOG_SEARCH_DEBOUNCE_MS, CATALOG_SEARCH_LIMIT, CATALOG_SEARCH_MIN_LENGTH } from './constants'

import styles from './styles.module.sass'

interface CatalogSearchProps {
    /** Called with the picked OpenNGC record */
    onSelect: (item: ApiModel.CatalogItem) => void
    label?: string
    placeholder?: string
    disabled?: boolean
    /** Empty the field after a pick (default); otherwise it keeps the designation of the pick */
    clearOnSelect?: boolean
    className?: string
}

/**
 * A search over the OpenNGC catalog by designation ("M3", "ngc 70") or an English common name
 * ("androm"): a field with a dropdown of the best matches, debounced, driven from the keyboard
 * (arrows, Enter, Escape). It only reports the pick: what to do with it is up to the form.
 */
export const CatalogSearch: React.FC<CatalogSearchProps> = ({
    onSelect,
    label,
    placeholder,
    disabled,
    clearOnSelect = true,
    className
}) => {
    const { t } = useTranslation()

    const listId = useId()
    const rootRef = useRef<HTMLDivElement>(null)

    const [value, setValue] = useState('')
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)

    // The request waits for a pause in typing
    useEffect(() => {
        const timer = setTimeout(() => setQuery(value.trim()), CATALOG_SEARCH_DEBOUNCE_MS)

        return () => clearTimeout(timer)
    }, [value])

    const enabled = query.length >= CATALOG_SEARCH_MIN_LENGTH

    // `currentData` is empty while the next query is in flight: no results of the previous text
    const { currentData, isFetching, isError } = API.useCatalogSearchQuery(
        { q: query, limit: CATALOG_SEARCH_LIMIT },
        { skip: !enabled }
    )

    const items = enabled ? (currentData?.items ?? []) : []
    const pending = value.trim() !== query || isFetching
    const showList = open && value.trim().length >= CATALOG_SEARCH_MIN_LENGTH

    const handleSelect = (item: ApiModel.CatalogItem) => {
        setOpen(false)
        setActiveIndex(-1)
        setValue(clearOnSelect ? '' : formatCatalogTitle(item))
        onSelect(item)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!items.length) {
                return
            }

            event.preventDefault()
            setOpen(true)
            setActiveIndex((index) =>
                event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length
            )
        } else if (event.key === 'Enter' && showList) {
            // Inside a form Enter would submit it: here it picks
            event.preventDefault()

            const item = items[activeIndex] ?? (items.length === 1 ? items[0] : undefined)

            if (item) {
                handleSelect(item)
            }
        } else if (event.key === 'Escape' && open) {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
        }
    }

    // Focus leaving the whole widget closes the list (a click on an option keeps it: see onMouseDown)
    const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
            setOpen(false)
        }
    }

    return (
        <div
            ref={rootRef}
            className={cn(styles.catalogSearch, className)}
            onBlur={handleBlur}
        >
            <Input
                type={'search'}
                size={'medium'}
                icon={'Search'}
                autoComplete={'off'}
                clearable={true}
                disabled={disabled}
                label={label}
                placeholder={
                    placeholder ?? t('components.common.catalog-search.placeholder', 'M 31, NGC 7000, Андромеда…')
                }
                value={value}
                role={'combobox'}
                aria-autocomplete={'list'}
                aria-expanded={showList}
                aria-controls={listId}
                aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
                onChange={(event) => {
                    setValue(event.target.value)
                    setActiveIndex(-1)
                    setOpen(true)
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
            />

            {showList && (
                <ul
                    id={listId}
                    role={'listbox'}
                    className={styles.list}
                    aria-label={t('components.common.catalog-search.results', 'Результаты поиска по каталогу')}
                >
                    {items.map((item, index) => {
                        const commonName = item.nameRu ?? item.commonNames[0]

                        return (
                            // The keyboard drives the options from the field (combobox pattern)
                            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                            <li
                                key={item.id}
                                id={`${listId}-${index}`}
                                role={'option'}
                                aria-selected={index === activeIndex}
                                className={cn(styles.option, index === activeIndex && styles.active)}
                                // Keep the focus in the field: a blur would close the list before the click lands
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => handleSelect(item)}
                            >
                                <span className={styles.title}>
                                    {formatCatalogTitle(item)}
                                    {commonName && <span className={styles.name}>{commonName}</span>}
                                </span>
                                <span className={styles.meta}>
                                    {getCatalogTypeLabel(item.type, t)}
                                    {typeof item.magnitude === 'number' &&
                                        ` · ${item.magnitude.toLocaleString(undefined, { maximumFractionDigits: 1 })}ᵐ`}
                                </span>
                            </li>
                        )
                    })}

                    {!items.length && (
                        <li
                            className={styles.status}
                            role={'presentation'}
                        >
                            {pending
                                ? t('components.common.catalog-search.searching', 'Ищем…')
                                : isError
                                  ? t('components.common.catalog-search.error', 'Каталог не отвечает')
                                  : t('components.common.catalog-search.empty', 'Ничего не найдено')}
                        </li>
                    )}
                </ul>
            )}
        </div>
    )
}
