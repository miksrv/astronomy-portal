import React from 'react'
import { cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiType } from '@/api'

import styles from './styles.module.sass'

interface RatingSummaryProps {
    summary?: ApiType.Comments.RatingSummary
    className?: string
}

/**
 * The headline rating of the reviews: «★ 4,9 · 1 234 отзыва». Nothing until there is a rated
 * review (an older API without the summary shows nothing either)
 */
export const RatingSummary: React.FC<RatingSummaryProps> = ({ summary, className }) => {
    const { t, i18n } = useTranslation()

    if (!summary?.count || summary.average == null) {
        return null
    }

    const average = summary.average.toLocaleString(i18n.language, {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1
    })

    return (
        <p className={cn(styles.summary, className)}>
            {/* Read out as one sentence: «Средняя оценка 4,9 из 5, 30 отзывов» */}
            <span className={'visuallyHidden'}>
                {t('components.common.review-card.summary-label', 'Средняя оценка {{average}} из 5', { average })},
            </span>
            <span
                className={styles.summaryStar}
                aria-hidden={'true'}
            >
                ★
            </span>
            <span
                className={styles.summaryAverage}
                aria-hidden={'true'}
            >
                {average}
            </span>
            <span
                className={styles.summaryDot}
                aria-hidden={'true'}
            >
                ·
            </span>
            <span className={styles.summaryCount}>
                {t('components.common.review-card.summary-count', '{{formattedCount}} отзывов', {
                    count: summary.count,
                    formattedCount: summary.count.toLocaleString(i18n.language)
                })}
            </span>
        </p>
    )
}
