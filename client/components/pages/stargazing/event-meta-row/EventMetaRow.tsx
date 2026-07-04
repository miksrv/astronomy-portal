import React from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

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

export const EventMetaRow: React.FC<EventMetaRowProps> = ({ className, date, views, membersCount, statisticHref }) => {
    const { t } = useTranslation()

    const dateLabel = t('pages.stargazing.event-date-label', 'Дата')
    const viewsLabel = t('pages.stargazing.views-label', 'Просмотров')
    const membersLabel = t('pages.stargazing.members-label', 'Участников')

    const formattedDate = formatDate(date, 'D MMMM YYYY')

    return (
        <div className={cn(styles.toolbar, className)}>
            <div aria-label={`${dateLabel}: ${formattedDate}`}>
                <Icon
                    name={'Time'}
                    aria-hidden
                />
                {formattedDate}
            </div>

            <div aria-label={`${viewsLabel}: ${views}`}>
                <Icon
                    name={'Eye'}
                    aria-hidden
                />
                {views}
            </div>

            {statisticHref ? (
                <Link
                    className={styles.membersLink}
                    href={statisticHref}
                    aria-label={`${membersLabel}: ${membersCount}`}
                >
                    <Icon
                        name={'Users'}
                        aria-hidden
                    />
                    {membersCount}
                </Link>
            ) : (
                <div aria-label={`${membersLabel}: ${membersCount}`}>
                    <Icon
                        name={'Users'}
                        aria-hidden
                    />
                    {membersCount}
                </div>
            )}
        </div>
    )
}
