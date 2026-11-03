import React from 'react'

import { Switch } from '@/components/ui'

import styles from './styles.module.sass'

interface StarMapSettingsSwitchProps {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
}

/**
 * A layer toggle of the settings sidebar: the caption on the left, the project `Switch` on
 * the right. The whole row takes the click, the way a native `<label>` would — the switch
 * itself is a button (`role="switch"`), which a `<label>` cannot point at.
 */
const StarMapSettingsSwitch: React.FC<StarMapSettingsSwitchProps> = ({ label, checked, onChange }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a larger hit area for the switch, which stays the keyboard target
    <div
        className={styles.settingsSwitch}
        onClick={(event) => {
            // The switch handles its own click; the row only forwards clicks on the caption
            if (!(event.target as HTMLElement).closest('[role="switch"]')) {
                onChange(!checked)
            }
        }}
    >
        <span className={styles.settingsSwitchLabel}>{label}</span>
        <Switch
            checked={checked}
            tone={'accent'}
            aria-label={label}
            onChange={onChange}
        />
    </div>
)

export default StarMapSettingsSwitch
