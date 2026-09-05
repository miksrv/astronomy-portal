import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button, cn, Container, Input, Spinner } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { loadConstellations, loadDsoCatalog, loadDsoNames, loadStarCatalog, loadStarNames } from './catalogs'
import { KindIcon } from './kindIcons'
import { buildSearchIndex, matchSearchItems, SearchItem } from './searchIndex'
import { StarMapObject } from './StarMap'
import { useKindLabels } from './useKindLabels'
import { useListNavigation } from './useListNavigation'

import styles from './styles.module.sass'

interface StarMapSearchProps {
    open: boolean
    objects?: StarMapObject[]
    /** The DSO data file currently displayed on the map ('dsos.bright.json' or 'dsos.6.json') */
    dsoCatalogFile: string
    onSelect: (item: SearchItem) => void
    onClose: () => void
}

const StarMapSearch: React.FC<StarMapSearchProps> = ({ open, objects, dsoCatalogFile, onSelect, onClose }) => {
    const { t, i18n } = useTranslation()
    const kindLabels = useKindLabels()

    const [query, setQuery] = useState('')
    const [items, setItems] = useState<SearchItem[] | null>(null)
    const listId = useId()

    // The name catalogs load lazily the first time search opens (FE-4); the browser's
    // HTTP cache already has them (d3-celestial fetched the same files for rendering)
    useEffect(() => {
        if (!open || items) {
            return
        }

        let cancelled = false

        void Promise.all([
            loadStarNames(),
            loadDsoNames(),
            loadConstellations(),
            loadStarCatalog(),
            loadDsoCatalog(dsoCatalogFile)
        ]).then(([starNames, dsoNames, constellations, starPositions, dsoPositions]) => {
            if (cancelled) {
                return
            }

            setItems(
                buildSearchIndex({
                    language: i18n?.language,
                    portalObjects: objects,
                    starNames,
                    dsoNames,
                    constellations,
                    starPositions,
                    dsoPositions,
                    bodyLabels: {
                        Sun: t('components.common.star-map.bodies.sun', 'Солнце'),
                        Moon: t('components.common.star-map.bodies.moon', 'Луна'),
                        Mercury: t('components.common.star-map.bodies.mercury', 'Меркурий'),
                        Venus: t('components.common.star-map.bodies.venus', 'Венера'),
                        Mars: t('components.common.star-map.bodies.mars', 'Марс'),
                        Jupiter: t('components.common.star-map.bodies.jupiter', 'Юпитер'),
                        Saturn: t('components.common.star-map.bodies.saturn', 'Сатурн'),
                        Uranus: t('components.common.star-map.bodies.uranus', 'Уран'),
                        Neptune: t('components.common.star-map.bodies.neptune', 'Нептун')
                    }
                })
            )
        })

        return () => {
            cancelled = true
        }
    }, [open, items])

    // Rebuild on language change (other locale's names), on DSO catalog swap (FE-5) and
    // when the portal objects arrive (they load async via RTK Query — an index built
    // before that would silently miss them; the prop is memoized upstream, so this only
    // fires on real data changes)
    useEffect(() => {
        setItems(null)
    }, [i18n?.language, dsoCatalogFile, objects])

    const panelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (open) {
            // The kit Input doesn't forward refs — focus the field through the panel node
            panelRef.current?.querySelector('input')?.focus()
        } else {
            setQuery('')
        }
    }, [open])

    const results = useMemo(() => (items ? matchSearchItems(items, query) : []), [items, query])
    const { activeIndex, setActiveIndex, reset, handleKeyDown: handleListKeyDown } = useListNavigation(results.length)

    const queryLongEnough = query.trim().length >= 2
    const activeItem = results[activeIndex]
    const optionId = (item: SearchItem) => `${listId}-${item.kind}-${item.id}`

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            onClose()
            return
        }

        if (handleListKeyDown(event)) {
            return
        }

        if (event.key === 'Enter') {
            const chosen = activeItem ?? results[0]

            if (chosen) {
                event.preventDefault()
                onSelect(chosen)
            }
        }
    }

    if (!open) {
        return null
    }

    return (
        <Container className={styles.searchPanel}>
            <div ref={panelRef}>
                <Input
                    size={'small'}
                    icon={'Search'}
                    placeholder={t('components.common.star-map.search.placeholder', 'Звезда, созвездие, планета…')}
                    value={query}
                    role={'combobox'}
                    aria-autocomplete={'list'}
                    aria-expanded={results.length > 0}
                    aria-controls={listId}
                    aria-activedescendant={activeItem ? optionId(activeItem) : undefined}
                    autoComplete={'off'}
                    onChange={(event) => {
                        setQuery(event.target.value)
                        reset()
                    }}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {!items && (
                <div className={styles.searchStatus}>
                    <Spinner />
                    {t('components.common.star-map.search.loading', 'Загрузка каталогов…')}
                </div>
            )}

            {items && !queryLongEnough && (
                <div className={styles.searchStatus}>
                    {t(
                        'components.common.star-map.search.hint',
                        'Введите название звезды, созвездия, планеты или объекта'
                    )}
                </div>
            )}

            {items && queryLongEnough && !results.length && (
                <div className={styles.searchStatus}>
                    {t('components.common.star-map.search.no-results', 'Ничего не найдено')}
                </div>
            )}

            {results.length > 0 && (
                <ul
                    id={listId}
                    role={'listbox'}
                    className={styles.searchResults}
                    // Keep focus in the input so a blur doesn't race the click on a result
                    onMouseDown={(event) => event.preventDefault()}
                >
                    {results.map((item, index) => (
                        <li
                            key={`${item.kind}_${item.id}`}
                            id={optionId(item)}
                            role={'option'}
                            aria-selected={index === activeIndex}
                        >
                            <Button
                                unstyled={true}
                                tabIndex={-1}
                                className={cn(styles.searchResult, index === activeIndex && styles.searchResultActive)}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => onSelect(item)}
                            >
                                <KindIcon
                                    kind={item.kind}
                                    className={styles.searchResultIcon}
                                />
                                <span className={styles.searchResultText}>
                                    <span className={styles.searchResultName}>{item.name}</span>
                                    <span className={styles.searchResultKind}>{kindLabels[item.kind]}</span>
                                </span>
                                {item.secondary && (
                                    <span className={styles.searchResultSecondary}>{item.secondary}</span>
                                )}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </Container>
    )
}

export default StarMapSearch
