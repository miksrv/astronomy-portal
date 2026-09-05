import React from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import {
    AtmosphereIcon,
    ConstellationLinesIcon,
    ConstellationNamesIcon,
    DeepSkyIcon,
    GraticuleIcon,
    HorizonIcon,
    MilkyWayIcon,
    RadiantIcon
} from '@/components/icons'

import {
    isQuickBarActive,
    isQuickBarEnabled,
    QUICK_BAR_ATMOSPHERE_KEY,
    QUICK_BAR_TOGGLE_KEYS,
    QUICK_BAR_VIEW_MODE_KEY,
    QuickBarKey,
    toggleQuickBarSetting
} from './quickBar'
import { StarMapSettings } from './types'

import styles from './styles.module.sass'

interface StarMapQuickBarProps {
    settings: StarMapSettings
    /** Same handler the settings sidebar uses — persists to localStorage and live-patches Celestial */
    onChange: (settings: StarMapSettings) => void
    /** Mobile: a bottom sheet (settings/search/link) is open — the bar hides so they don't stack */
    sheetOpen?: boolean
}

/**
 * Stellarium-style bottom bar with the most frequently flipped layers and the
 * sky ↔ horizon view switch. Every change goes through the shared settings handler,
 * so the sidebar, localStorage and the permalink stay in sync.
 */
const StarMapQuickBar: React.FC<StarMapQuickBarProps> = ({ settings, onChange, sheetOpen }) => {
    const { t } = useTranslation()

    // Literal t() calls (not a key-building loop) so the i18n scanner keeps these keys
    const labels: Record<QuickBarKey, string> = {
        'constellation-lines': t('components.common.star-map.quick-bar.constellation-lines', 'Линии созвездий'),
        'constellation-names': t('components.common.star-map.quick-bar.constellation-names', 'Названия созвездий'),
        graticule: t('components.common.star-map.quick-bar.graticule', 'Координатная сетка'),
        dsos: t('components.common.star-map.quick-bar.dsos', 'Объекты глубокого космоса'),
        planets: t('components.common.star-map.quick-bar.planets', 'Планеты, Солнце и Луна'),
        'milky-way': t('components.common.star-map.quick-bar.milky-way', 'Млечный Путь'),
        'meteor-showers': t('components.common.star-map.quick-bar.meteor-showers', 'Радианты метеорных потоков'),
        'horizon-mode': t('components.common.star-map.quick-bar.horizon-mode', 'Небо сейчас: вид с горизонтом'),
        atmosphere: t('components.common.star-map.quick-bar.atmosphere', 'Атмосфера: дневное и сумеречное небо')
    }

    const icons: Record<QuickBarKey, React.ReactNode> = {
        'constellation-lines': <ConstellationLinesIcon />,
        'constellation-names': <ConstellationNamesIcon />,
        graticule: <GraticuleIcon />,
        dsos: <DeepSkyIcon />,
        // The kit has a Sun glyph — rendered via the Button's own icon slot below
        planets: null,
        'milky-way': <MilkyWayIcon />,
        'meteor-showers': <RadiantIcon />,
        'horizon-mode': <HorizonIcon />,
        atmosphere: <AtmosphereIcon />
    }

    const renderToggle = (key: QuickBarKey) => {
        const active = isQuickBarActive(settings, key)
        const enabled = isQuickBarEnabled(settings, key)

        return (
            <Button
                key={key}
                size={'small'}
                mode={'secondary'}
                icon={key === 'planets' ? 'Sun' : undefined}
                title={labels[key]}
                aria-label={labels[key]}
                aria-pressed={active}
                disabled={!enabled}
                className={cn(styles.toolbarButton, styles.quickBarButton, active && styles.toolbarButtonActive)}
                onClick={() => onChange(toggleQuickBarSetting(settings, key))}
            >
                {icons[key]}
            </Button>
        )
    }

    return (
        <div
            className={cn(styles.quickBar, sheetOpen && styles.quickBarSheetOpen)}
            role={'toolbar'}
            aria-label={t('components.common.star-map.quick-bar.title', 'Быстрые переключатели слоёв')}
        >
            {QUICK_BAR_TOGGLE_KEYS.map(renderToggle)}
            <span
                className={styles.quickBarDivider}
                aria-hidden={'true'}
            />
            {renderToggle(QUICK_BAR_VIEW_MODE_KEY)}
            {renderToggle(QUICK_BAR_ATMOSPHERE_KEY)}
        </div>
    )
}

export default StarMapQuickBar
