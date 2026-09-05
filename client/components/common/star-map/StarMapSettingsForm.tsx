import React from 'react'
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

    const update = <K extends keyof StarMapSettingsType>(key: K, value: StarMapSettingsType[K]) => {
        onChange({ ...settings, [key]: value })
    }

    const viewModes: Array<{ mode: StarMapViewMode; label: string }> = [
        { mode: 'sky', label: t('components.common.star-map.settings.view-mode-sky', 'Карта неба') },
        { mode: 'horizon', label: t('components.common.star-map.settings.view-mode-horizon', 'Небо сейчас') }
    ]

    return (
        <Container className={styles.settingsPanel}>
            <div className={styles.settingsTitle}>
                {t('components.common.star-map.settings.title', 'Настройки карты')}
            </div>

            <div className={styles.settingsGroup}>
                <div className={styles.settingsGroupTitle}>
                    {t('components.common.star-map.settings.view-mode', 'Режим просмотра')}
                </div>
                <div className={styles.viewModeToggle}>
                    {viewModes.map(({ mode, label }) => (
                        <Button
                            key={mode}
                            size={'small'}
                            mode={settings.viewMode === mode ? 'primary' : 'secondary'}
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

            <div className={styles.settingsGroup}>
                <div className={styles.settingsGroupTitle}>
                    {t('components.common.star-map.settings.stars', 'Звёзды')}
                </div>
                <Checkbox
                    label={t('components.common.star-map.settings.show-stars', 'Показать звёзды')}
                    checked={settings.starsShow}
                    onChange={(e) => update('starsShow', e.target.checked)}
                />
                {settings.starsShow && (
                    <Select
                        size={'small'}
                        label={t('components.common.star-map.settings.star-magnitude', 'Макс. звёздная величина')}
                        options={STARS_LIMIT_OPTIONS}
                        value={settings.starsLimit}
                        onSelect={(selected) => {
                            if (selected?.[0]) {
                                update('starsLimit', selected[0].key)
                            }
                        }}
                    />
                )}
            </div>

            <div className={styles.settingsGroup}>
                <div className={styles.settingsGroupTitle}>
                    {t('components.common.star-map.settings.objects', 'Объекты')}
                </div>
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
                    label={t('components.common.star-map.settings.show-custom-objects', 'Мои объекты')}
                    checked={settings.customObjectsShow}
                    onChange={(e) => update('customObjectsShow', e.target.checked)}
                />
                <Checkbox
                    label={t('components.common.star-map.settings.meteor-showers', 'Радианты метеорных потоков')}
                    checked={settings.meteorShowersShow}
                    onChange={(e) => update('meteorShowersShow', e.target.checked)}
                />
            </div>

            <div className={styles.settingsGroup}>
                <div className={styles.settingsGroupTitle}>
                    {t('components.common.star-map.settings.constellations', 'Созвездия')}
                </div>
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
            </div>

            <div className={styles.settingsGroup}>
                <div className={styles.settingsGroupTitle}>
                    {t('components.common.star-map.settings.grid-and-lines', 'Сетка и линии')}
                </div>
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
            </div>

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

export default StarMapSettingsForm
