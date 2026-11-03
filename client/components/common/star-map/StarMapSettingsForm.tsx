import React, { useId } from 'react'
import { Container, Select } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { SegmentedControl, SegmentedOption } from '@/components/ui'

import { CONSTELLATION_KEYS, GRID_KEYS, STARS_LIMIT_OPTIONS } from './constants'
import StarMapSettingsGroup from './StarMapSettingsGroup'
import StarMapSettingsSwitch from './StarMapSettingsSwitch'
import { StarMapSettings as StarMapSettingsType, StarMapSettingsSwitchKey as SwitchKey, StarMapViewMode } from './types'

import styles from './styles.module.sass'

interface StarMapSettingsFormProps {
    settings: StarMapSettingsType
    onChange: (settings: StarMapSettingsType) => void
    /** Location & date/time control (FE-2), rendered inside the panel below the view-mode toggle */
    locationControl?: React.ReactNode
}

const StarMapSettingsForm: React.FC<StarMapSettingsFormProps> = ({ settings, onChange, locationControl }) => {
    const { t } = useTranslation()
    const starMagnitudeLabelId = useId()

    const update = <K extends keyof StarMapSettingsType>(key: K, value: StarMapSettingsType[K]) => {
        onChange({ ...settings, [key]: value })
    }

    const starMagnitudeLabel = t('components.common.star-map.settings.star-magnitude', 'Макс. величина')

    // The two modes are named the same everywhere (toolbar FAB, quick bar, this toggle)
    const viewModes: Array<SegmentedOption<StarMapViewMode>> = [
        { key: 'sky', label: t('components.common.star-map.toolbar.sky-map', 'Карта неба') },
        { key: 'horizon', label: t('components.common.star-map.toolbar.sky-above', 'Небо над вами') }
    ]

    const sw = (key: SwitchKey, label: string) => (
        <StarMapSettingsSwitch
            label={label}
            checked={settings[key]}
            onChange={(checked) => update(key, checked)}
        />
    )

    // "2 из 4" beside the title of a collapsed group, so it still tells what is on
    const countOn = (keys: SwitchKey[]) =>
        t('components.common.star-map.settings.group-summary', '{{on}} из {{total}}', {
            on: keys.filter((key) => settings[key]).length,
            total: keys.length
        })

    return (
        <Container className={styles.settingsPanel}>
            {/* No panel title and no heading over the mode toggle: the panel is opened from
                a labelled button and the two modes name themselves. */}
            <StarMapSettingsGroup>
                <SegmentedControl
                    aria-label={t('components.common.star-map.settings.view-mode', 'Режим просмотра')}
                    className={styles.viewModeToggle}
                    options={viewModes}
                    value={settings.viewMode}
                    onChange={(mode) => settings.viewMode !== mode && update('viewMode', mode)}
                />
                {settings.viewMode === 'horizon' &&
                    sw('atmosphere', t('components.common.star-map.settings.atmosphere', 'Атмосфера'))}
            </StarMapSettingsGroup>

            {locationControl}

            <StarMapSettingsGroup title={t('components.common.star-map.settings.stars', 'Звёзды')}>
                {sw('starsShow', t('components.common.star-map.settings.show-stars', 'Показать звёзды'))}
                {/* The kit's Select stacks its own `label` above the field, which in a 280px
                    sidebar spends a whole row on two words, so the caption sits beside it.
                    The kit spreads extra props onto the Select's outer div (not the combobox),
                    so that div becomes a labelled group — the only association reachable
                    from outside; a bare `aria-label` there would name nothing. */}
                {settings.starsShow && (
                    <div className={styles.settingsRow}>
                        <span
                            id={starMagnitudeLabelId}
                            className={styles.settingsRowLabel}
                        >
                            {starMagnitudeLabel}
                        </span>
                        <Select
                            size={'small'}
                            role={'group'}
                            aria-labelledby={starMagnitudeLabelId}
                            className={styles.settingsRowControl}
                            options={STARS_LIMIT_OPTIONS}
                            value={settings.starsLimit}
                            onSelect={(selected) => {
                                if (selected?.[0]) {
                                    update('starsLimit', selected[0].key)
                                }
                            }}
                        />
                    </div>
                )}
                {sw('milkyWay', t('components.common.star-map.settings.milky-way', 'Млечный Путь'))}
            </StarMapSettingsGroup>

            <StarMapSettingsGroup title={t('components.common.star-map.settings.objects', 'Объекты')}>
                {sw('planetsShow', t('components.common.star-map.settings.planets', 'Планеты, Солнце, Луна'))}
                {sw('dsosShow', t('components.common.star-map.settings.show-dso', 'Объекты глубокого космоса'))}
                {settings.dsosShow &&
                    sw('dsosFull', t('components.common.star-map.settings.show-dso-full', 'Больше объектов'))}
                {sw(
                    'customObjectsShow',
                    t('components.common.star-map.settings.show-custom-objects', 'Объекты обсерватории')
                )}
                {sw(
                    'meteorShowersShow',
                    t('components.common.star-map.settings.meteor-showers', 'Радианты метеорных потоков')
                )}
            </StarMapSettingsGroup>

            {/* The rarely flipped layers fold away, so the sidebar opens on the place, the
                time and the main layers; each closed group still counts what is on */}
            <StarMapSettingsGroup
                title={t('components.common.star-map.settings.constellations', 'Созвездия')}
                storageKey={'constellations'}
                defaultOpen={false}
                summary={countOn(CONSTELLATION_KEYS)}
            >
                {sw('constellationNames', t('components.common.star-map.settings.constellation-names', 'Названия'))}
                {sw('constellationLines', t('components.common.star-map.settings.constellation-lines', 'Линии'))}
                {sw('constellationBounds', t('components.common.star-map.settings.constellation-bounds', 'Границы'))}
            </StarMapSettingsGroup>

            <StarMapSettingsGroup
                title={t('components.common.star-map.settings.grid-and-lines', 'Сетка и линии')}
                storageKey={'grid'}
                defaultOpen={false}
                summary={countOn(GRID_KEYS)}
            >
                {sw('graticule', t('components.common.star-map.settings.graticule', 'Координатная сетка'))}
                {sw('equatorial', t('components.common.star-map.settings.equator', 'Экватор'))}
                {sw('ecliptic', t('components.common.star-map.settings.ecliptic', 'Эклиптика'))}
                {sw('galactic', t('components.common.star-map.settings.galactic-plane', 'Галактическая плоскость'))}
            </StarMapSettingsGroup>
        </Container>
    )
}

// `settings` is replaced wholesale on every change and the handler is stable upstream, so a
// shallow compare skips the re-render on every unrelated map state change. Note that a JSX
// `locationControl` is a fresh element each parent render — the memo only pays off while
// the parent keeps it referentially stable (or omits it).
export default React.memo(StarMapSettingsForm)
