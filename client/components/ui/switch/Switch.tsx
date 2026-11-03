import React from 'react'
import { Button, cn, Spinner } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface SwitchProps {
    checked: boolean
    /** What the switch turns on and off: it has no visible text of its own */
    'aria-label': string
    /**
     * The colour of "on": `status` (green) where on is a state of the world — a relay
     * powering a device; `accent` (the brand periwinkle) for a view setting such as a map
     * layer, where green would read as a status that isn't there
     */
    tone?: 'status' | 'accent'
    disabled?: boolean
    loading?: boolean
    className?: string
    onChange?: (checked: boolean) => void
}

/** An on/off toggle that takes effect at once (a relay, a setting), not a form field */
export const Switch: React.FC<SwitchProps> = ({
    checked,
    tone = 'status',
    disabled,
    loading,
    className,
    onChange,
    ...props
}) => (
    <Button
        unstyled={true}
        role={'switch'}
        aria-checked={checked}
        aria-label={props['aria-label']}
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        className={cn(styles.switch, tone === 'accent' && styles.accent, checked && styles.checked, className)}
        onClick={() => onChange?.(!checked)}
    >
        <span className={styles.thumb}>{loading && <Spinner className={styles.spinner} />}</span>
    </Button>
)
