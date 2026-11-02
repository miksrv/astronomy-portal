import React from 'react'
import { cn, Icon, IconTypes } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface CardTitleProps {
    children: React.ReactNode
    icon?: IconTypes
    /** The heading level: cards that are sections of a page are `h2` (default), nested ones `h3` */
    as?: 'h2' | 'h3'
    id?: string
    className?: string
}

/** The title of a card (`Container`'s `header`): an optional icon in the secondary colour, then the text */
export const CardTitle: React.FC<CardTitleProps> = ({ children, icon, as: Tag = 'h2', id, className }) => (
    <Tag
        id={id}
        className={cn(styles.cardTitle, className)}
    >
        {icon && <Icon name={icon} />}
        {children}
    </Tag>
)

interface CardMetaProps {
    children: React.ReactNode
    className?: string
}

/** The small secondary text in a card's header, right of the title (`Container`'s `action`) */
export const CardMeta: React.FC<CardMetaProps> = ({ children, className }) => (
    <span className={cn(styles.cardMeta, className)}>{children}</span>
)
