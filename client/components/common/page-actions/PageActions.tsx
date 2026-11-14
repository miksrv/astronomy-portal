import React from 'react'
import { Button, cn, Icon, IconTypes, Popout } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel, useAppSelector } from '@/api'
import { hasAnyPermission } from '@/utils/permissions'

import styles from './styles.module.sass'

export interface PageAction {
    key: string
    label: string
    icon?: IconTypes
    /** A page to go to... */
    link?: string
    /** ...or something to do here */
    onClick?: () => void
    /** Who sees the item: any of these privileges. Without it - everyone who sees the menu */
    permission?: ApiModel.Permission | ApiModel.Permission[]
    disabled?: boolean
    /** A destructive action (delete, cancel): red, at the end, after a divider */
    variant?: 'negative'
}

interface PageActionsProps {
    actions: PageAction[]
    /** Over a picture: the button gets a backdrop of its own */
    overlay?: boolean
    className?: string
}

/**
 * The editor's actions on a page - add, edit, delete, … - behind one "Действия ▾" button in the top right
 * (a single allowed action is shown as that one button instead)
 * corner of the page header. Each item names the privileges it needs and the menu shows only those
 * the viewer has; with none left there is no button at all, so a guest sees the page as it is.
 */
export const PageActions: React.FC<PageActionsProps> = ({ actions, overlay, className }) => {
    const { t } = useTranslation()
    const user = useAppSelector((state) => state.auth?.user)

    const visible = actions.filter(
        ({ permission }) => !permission || hasAnyPermission(user, Array.isArray(permission) ? permission : [permission])
    )

    if (!visible.length) {
        return null
    }

    // One action needs no menu: it is the button itself ("Добавить" on a catalog), the same
    // primary button at the same place. "Действия ▾" only from two actions on
    const [single] = visible

    if (visible.length === 1 && single) {
        const item = single

        // A page to go to is a link (next/link, a new tab works), drawn as the primary button;
        // something to do here is the kit's own primary button
        return item.link && !item.disabled ? (
            <Link
                href={item.link}
                className={cn(
                    styles.trigger,
                    styles.single,
                    !overlay && styles.inline,
                    overlay && styles.overlay,
                    className
                )}
            >
                {item.icon && <Icon name={item.icon} />}
                {item.label}
            </Link>
        ) : (
            <Button
                className={cn(!overlay && styles.inline, overlay && styles.overlayButton, className)}
                mode={'primary'}
                variant={item.variant}
                icon={item.icon}
                label={item.label}
                disabled={item.disabled}
                onClick={item.onClick}
            />
        )
    }

    // The destructive ones go last, so that a miss on the menu never deletes anything
    const items = [
        ...visible.filter(({ variant }) => variant !== 'negative'),
        ...visible.filter(({ variant }) => variant === 'negative')
    ]
    const firstNegative = items.findIndex(({ variant }) => variant === 'negative')

    return (
        <Popout
            className={cn(!overlay && styles.inline, className)}
            position={'right'}
            closeOnChildrenClick={true}
            aria-label={t('common.page-actions', 'Действия')}
            title={t('common.page-actions', 'Действия')}
            trigger={
                // The look of the kit's small primary button: a Popout trigger is a button
                // already, so a kit Button can't go inside it
                <span className={cn(styles.trigger, overlay && styles.overlay)}>
                    {t('common.page-actions', 'Действия')}
                    <Icon
                        name={'KeyboardDown'}
                        className={styles.arrow}
                    />
                </span>
            }
        >
            <ul className={styles.menu}>
                {items.map((item, index) => (
                    <li
                        key={item.key}
                        className={cn(index === firstNegative && index > 0 && styles.divider)}
                    >
                        {item.link && !item.disabled ? (
                            <Link
                                href={item.link}
                                className={styles.item}
                            >
                                {item.icon && <Icon name={item.icon} />}
                                {item.label}
                            </Link>
                        ) : (
                            <Button
                                unstyled={true}
                                icon={item.icon}
                                label={item.label}
                                disabled={item.disabled}
                                className={cn(styles.item, item.variant === 'negative' && styles.negative)}
                                onClick={item.onClick}
                            />
                        )}
                    </li>
                ))}
            </ul>
        </Popout>
    )
}
