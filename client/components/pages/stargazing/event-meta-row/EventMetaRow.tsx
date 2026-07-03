import React from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import Link from 'next/link'

import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

interface EventMetaRowProps {
    className?: string
    date?: string
    views?: number
    membersCount?: number
    /** When present, the members count links to the event's statistic page instead of a static block. */
    statisticHref?: string
}

export const EventMetaRow: React.FC<EventMetaRowProps> = ({ className, date, views, membersCount, statisticHref }) => (
    <div className={cn(styles.toolbar, className)}>
        <div>
            <Icon name={'Time'} />
            {formatDate(date, 'D MMMM YYYY')}
        </div>

        <div>
            <Icon name={'Eye'} />
            {views}
        </div>

        {statisticHref ? (
            <Link
                className={styles.membersLink}
                href={statisticHref}
            >
                <Icon name={'Users'} />
                {membersCount}
            </Link>
        ) : (
            <div>
                <Icon name={'Users'} />
                {membersCount}
            </div>
        )}
    </div>
)
