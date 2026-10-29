import React, { useId } from 'react'
import { Button, Checkbox, Container, Select } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { STARS_LIMIT_OPTIONS } from './constants'
import { StarMapSettings as StarMapSettingsType, StarMapViewMode } from './types'

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
    const viewModes: Array<{ mode: StarMapViewMode; label: string }> = [
        { mode: 'sky', label: t('components.common.star-map.toolbar.sky-map', 'Карта неба') },
        { mode: 'horizon', label: t('components.common.star-map.toolbar.sky-above', 'Небо над вами') }
    ]

    return (
        <Container className={styles.settingsPanel}>
            {/* No panel title and no heading over the mode toggle: the panel is opened from
                a labelled button and the two mode buttons name themselves. */}
            <div className={styles.settingsGroup}>
                <div
                    className={styles.viewModeToggle}
                    role={'group'}
                    aria-label={t('components.common.star-map.settings.view-mode', 'Режим просмотра')}
                >
                    {viewModes.map(({ mode, label }) => (
                        <Button
                            key={mode}
                            size={'small'}
                            mode={settings.viewMode === mode ? 'primary' : 'outline'}
                            aria-pressed={settings.viewMode === mode}
                            onClick={() => settings.viewMode !== mode && update('viewMode', mode)}
                        >
                            {label}
                        </Button>
                    ))}
                </div>
                {settings.viewMode === 'horizon' && (
                    <Checkbox
                        label={t('components.common.star-map.settings.atmosphere', 'Атмосфера')}
                        checked={settings.atmosphere}
                        onChange={(e) => update('atmosphere', e.target.checked)}
                    />
                )}
            </div>

            {locationControl}

            <fieldset className={styles.settingsGroup}>
                <legend className={styles.settingsGroupTitle}>
                    {t('components.common.star-map.settings.stars', 'Звёзды')}
                </legend>
                <Checkbox
                    label={t('components.common.star-map.settings.show-stars', 'Показать звёзды')}
                    checked={settings.starsShow}
                    onChange={(e) => update('starsShow', e.target.checked)}
                />
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
            </fieldset>

            <fieldset className={styles.settingsGroup}>
                <legend className={styles.settingsGroupTitle}>
                    {t('components.common.star-map.settings.objects', 'Объекты')}
                </legend>
                <Checkbox
                    label={t('components.common.star-map.settings.show-dso', 'Объекты глубокого космоса')}
                    checked={settings.dsosShow}
                    onChange={(e) => update('dsosShow', e.target.checked)}
                />
                {settings.dsosShow && (
                    <Checkbox
                        label={t('components.common.star-map.settings.show-dso-full', 'Больше объектов')}
                        checked={settings.dsosFull}
                        onChange={(e) => update('dsosFull', e.target.checked)}
                    />
                )}
                <Checkbox
                    label={t('components.common.star-map.settings.show-custom-objects', 'Объекты обсерватории')}
                    checked={settings.customObjectsShow}
                    onChange={(e) => update('customObjectsShow', e.target.checked)}
                />
                <Checkbox
                    label={t('components.common.star-map.settings.meteor-showers', 'Радианты метеорных потоков')}
                    checked={settings.meteorShowersShow}
                    onChange={(e) => update('meteorShowersShow', e.target.checked)}
                />
            </fieldset>

            <fieldset className={styles.settingsGroup}>
                <legend className={styles.settingsGroupTitle}>
                    {t('components.common.star-map.settings.constellations', 'Созвездия')}
                </legend>
                <Checkbox
                    label={t('components.common.star-map.settings.constellation-names', 'Названия')}
                    checked={settings.constellationNames}
                    onChange={(e) => update('constellationNames', e.target.checked)}
                />
                <Checkbox
                    label={t('components.common.star-map.settings.constellation-lines', 'Линии')}
                    checked={settings.constellationLines}
                    onChange={(e) => update('constellationLines', e.target.checked)}
                />
                <Checkbox
                    label={t('components.common.star-map.settings.constellation-bounds', 'Границы')}
                    checked={settings.constellationBounds}
                    onChange={(e) => update('constellationBounds', e.target.checked)}
                />
            </fieldset>

            <fieldset className={styles.settingsGroup}>
                <legend className={styles.settingsGroupTitle}>
                    {t('components.common.star-map.settings.grid-and-lines', 'Сетка и линии')}
                </legend>
                <Checkbox
                    label={t('components.common.star-map.settings.graticule', 'Координатная сетка')}
                    checked={settings.graticule}
                    onChange={(e) => update('graticule', e.target.checked)}
                />
                <Checkbox
                    label={t('components.common.star-map.settings.equator', 'Экватор')}
                    checked={settings.equatorial}
                    onChange={(e) => update('equatorial', e.target.checked)}
                />
                <Checkbox
                    label={t('components.common.star-map.settings.ecliptic', 'Эклиптика')}
                    checked={settings.ecliptic}
                    onChange={(e) => update('ecliptic', e.target.checked)}
                />
                <Checkbox
                    label={t('components.common.star-map.settings.galactic-plane', 'Галактическая плоскость')}
                    checked={settings.galactic}
                    onChange={(e) => update('galactic', e.target.checked)}
                />
            </fieldset>

            <div className={styles.settingsGroup}>
                <Checkbox
                    label={t('components.common.star-map.settings.milky-way', 'Млечный Путь')}
                    checked={settings.milkyWay}
                    onChange={(e) => update('milkyWay', e.target.checked)}
                />
                <Checkbox
                    label={t('components.common.star-map.settings.planets', 'Планеты, Солнце, Луна')}
                    checked={settings.planetsShow}
                    onChange={(e) => update('planetsShow', e.target.checked)}
                />
            </div>
        </Container>
    )
}

// `settings` is replaced wholesale on every change and the handler is stable upstream, so a
// shallow compare skips the re-render on every unrelated map state change. Note that a JSX
// `locationControl` is a fresh element each parent render — the memo only pays off while
// the parent keeps it referentially stable (or omits it).
export default React.memo(StarMapSettingsForm)
