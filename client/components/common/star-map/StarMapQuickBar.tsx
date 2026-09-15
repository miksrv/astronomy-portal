import React, { useMemo } from 'react'
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

// The kit has a Sun glyph — rendered via the Button's own icon slot, hence no node here
const ICONS: Record<QuickBarKey, React.ReactNode> = {
    'constellation-lines': <ConstellationLinesIcon />,
    'constellation-names': <ConstellationNamesIcon />,
    graticule: <GraticuleIcon />,
    dsos: <DeepSkyIcon />,
    planets: null,
    'milky-way': <MilkyWayIcon />,
    'meteor-showers': <RadiantIcon />,
    'horizon-mode': <HorizonIcon />,
    atmosphere: <AtmosphereIcon />
}

/**
 * `role="toolbar"` promises arrow-key navigation (WAI-ARIA toolbar pattern): ←/→ move
 * focus between the enabled buttons, Home/End jump to the ends. Every button stays in the
 * tab order too — the bar is short and the buttons are the only controls in it.
 */
const handleToolbarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return
    }

    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)

    if (!buttons.length || current === -1) {
        return
    }

    const last = buttons.length - 1
    const next =
        event.key === 'ArrowRight'
            ? (current + 1) % buttons.length
            : event.key === 'ArrowLeft'
              ? (current - 1 + buttons.length) % buttons.length
              : event.key === 'Home'
                ? 0
                : last

    event.preventDefault()
    buttons[next]?.focus()
}

/**
 * Stellarium-style bottom bar with the most frequently flipped layers and the
 * sky ↔ horizon view switch. Every change goes through the shared settings handler,
 * so the sidebar, localStorage and the permalink stay in sync.
 */
const StarMapQuickBar: React.FC<StarMapQuickBarProps> = ({ settings, onChange, sheetOpen }) => {
    const { t } = useTranslation()

    // Literal t() calls (not a key-building loop) so the i18n scanner keeps these keys
    const labels = useMemo<Record<QuickBarKey, string>>(
        () => ({
            'constellation-lines': t('components.common.star-map.quick-bar.constellation-lines', 'Линии созвездий'),
            'constellation-names': t('components.common.star-map.quick-bar.constellation-names', 'Названия созвездий'),
            graticule: t('components.common.star-map.quick-bar.graticule', 'Координатная сетка'),
            dsos: t('components.common.star-map.quick-bar.dsos', 'Объекты глубокого космоса'),
            planets: t('components.common.star-map.quick-bar.planets', 'Планеты, Солнце и Луна'),
            'milky-way': t('components.common.star-map.quick-bar.milky-way', 'Млечный Путь'),
            'meteor-showers': t('components.common.star-map.quick-bar.meteor-showers', 'Радианты метеорных потоков'),
            'horizon-mode': t('components.common.star-map.quick-bar.horizon-mode', 'Небо над вами: вид с горизонтом'),
            atmosphere: t('components.common.star-map.quick-bar.atmosphere', 'Атмосфера: дневное и сумеречное небо')
        }),
        [t]
    )

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
                {ICONS[key]}
            </Button>
        )
    }

    return (
        <div
            className={cn(styles.quickBar, sheetOpen && styles.quickBarSheetOpen)}
            role={'toolbar'}
            aria-label={t('components.common.star-map.quick-bar.title', 'Быстрые переключатели слоёв')}
            onKeyDown={handleToolbarKeyDown}
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

// Props are a settings object replaced on change, a stable callback and a boolean — the
// shallow compare keeps the bar out of every unrelated map re-render
export default React.memo(StarMapQuickBar)
