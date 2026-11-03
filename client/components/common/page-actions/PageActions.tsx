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
 * The editor's actions on a page - add, edit, delete, … - behind one "⋯" button in the top right
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
                <span className={cn(styles.trigger, overlay && styles.overlay)}>
                    <Icon name={'VerticalDots'} />
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
