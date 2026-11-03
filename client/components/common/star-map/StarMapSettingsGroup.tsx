import React, { useId, useState } from 'react'
import { Button, cn, Icon } from 'simple-react-ui-kit'

import { readGroupOpen, writeGroupOpen } from './settingsGroups'

import styles from './styles.module.sass'

interface StarMapSettingsGroupProps {
    /** Group label, set as an overline; without it the group is a plain block */
    title?: string
    /**
     * Collapsible groups (the rarely flipped layers) remember whether they are open between
     * visits under this key; without one the group is always open
     */
    storageKey?: string
    defaultOpen?: boolean
    /** Shown beside the title of a collapsible group, e.g. how many of its layers are on */
    summary?: string
    children: React.ReactNode
}

/**
 * One titled block of the settings sidebar: a `<fieldset>` with its `<legend>`. A
 * collapsible one turns the legend into a disclosure button, so a closed group still says
 * what it holds and how much of it is on.
 */
const StarMapSettingsGroup: React.FC<StarMapSettingsGroupProps> = ({
    title,
    storageKey,
    defaultOpen = true,
    summary,
    children
}) => {
    const bodyId = useId()
    const [open, setOpen] = useState(() => (storageKey ? readGroupOpen(storageKey, defaultOpen) : true))

    if (!title) {
        return <div className={styles.settingsGroup}>{children}</div>
    }

    const toggle = () => {
        setOpen((previous) => {
            if (storageKey) {
                writeGroupOpen(storageKey, !previous)
            }

            return !previous
        })
    }

    return (
        <fieldset className={styles.settingsGroup}>
            <legend className={styles.settingsGroupTitle}>
                {storageKey ? (
                    <Button
                        unstyled={true}
                        aria-expanded={open}
                        aria-controls={bodyId}
                        className={styles.settingsGroupToggle}
                        onClick={toggle}
                    >
                        <span className={styles.settingsGroupLabel}>{title}</span>
                        {summary && <span className={styles.settingsGroupSummary}>{summary}</span>}
                        <Icon
                            name={'KeyboardDown'}
                            className={cn(styles.settingsGroupChevron, open && styles.settingsGroupChevronOpen)}
                        />
                    </Button>
                ) : (
                    <span className={styles.settingsGroupLabel}>{title}</span>
                )}
            </legend>
            <div
                id={bodyId}
                hidden={!open}
                className={styles.settingsGroupBody}
            >
                {children}
            </div>
        </fieldset>
    )
}

export default StarMapSettingsGroup
