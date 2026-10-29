import { StarMapSettings } from './types'

/**
 * Quick layer bar (Stellarium-style bottom toggles): the handful of layers people flip
 * most often, plus the view-mode switch. Pure data + toggle logic; the component maps
 * keys to icons and localized labels.
 */

export const QUICK_BAR_TOGGLE_KEYS = [
    'constellation-lines',
    'constellation-names',
    'graticule',
    'dsos',
    'planets',
    'milky-way',
    'meteor-showers'
] as const

export type QuickBarToggleKey = (typeof QUICK_BAR_TOGGLE_KEYS)[number]

/** Separate switch after the divider: 'sky' ↔ 'horizon' */
export const QUICK_BAR_VIEW_MODE_KEY = 'horizon-mode' as const

/** Horizon-mode-only companion of the view switch: the daylight/twilight gradient */
export const QUICK_BAR_ATMOSPHERE_KEY = 'atmosphere' as const

export type QuickBarKey = QuickBarToggleKey | typeof QUICK_BAR_VIEW_MODE_KEY | typeof QUICK_BAR_ATMOSPHERE_KEY

type BooleanSettingKey = {
    [K in keyof StarMapSettings]: StarMapSettings[K] extends boolean ? K : never
}[keyof StarMapSettings]

/** Which boolean setting each layer toggle flips */
export const QUICK_BAR_SETTING_KEYS: Record<QuickBarToggleKey | typeof QUICK_BAR_ATMOSPHERE_KEY, BooleanSettingKey> = {
    'constellation-lines': 'constellationLines',
    'constellation-names': 'constellationNames',
    graticule: 'graticule',
    dsos: 'dsosShow',
    planets: 'planetsShow',
    'milky-way': 'milkyWay',
    'meteor-showers': 'meteorShowersShow',
    atmosphere: 'atmosphere'
}

/**
 * Whether the toggle can be used at all: the atmosphere only exists in horizon mode
 * (the flat chart has no daylight pass), the rest are always available. Disabled — not
 * hidden — so the bar's layout never jumps when the mode changes.
 */
export const isQuickBarEnabled = (settings: StarMapSettings, key: QuickBarKey): boolean =>
    key !== QUICK_BAR_ATMOSPHERE_KEY || settings.viewMode === 'horizon'

/** Whether the toggle reads as "on" for the given settings */
export const isQuickBarActive = (settings: StarMapSettings, key: QuickBarKey): boolean => {
    if (key === QUICK_BAR_VIEW_MODE_KEY) {
        return settings.viewMode === 'horizon'
    }

    if (key === QUICK_BAR_ATMOSPHERE_KEY) {
        return settings.viewMode === 'horizon' && settings.atmosphere
    }

    return Boolean(settings[QUICK_BAR_SETTING_KEYS[key]])
}

/** New settings with the toggle flipped; the settings object is never mutated */
export const toggleQuickBarSetting = (settings: StarMapSettings, key: QuickBarKey): StarMapSettings => {
    if (key === QUICK_BAR_VIEW_MODE_KEY) {
        return { ...settings, viewMode: settings.viewMode === 'horizon' ? 'sky' : 'horizon' }
    }

    const settingKey = QUICK_BAR_SETTING_KEYS[key]

    return { ...settings, [settingKey]: !settings[settingKey] }
}
