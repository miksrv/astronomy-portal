import React from 'react'
import { cn, Skeleton } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiType } from '@/api'
import { Pagination } from '@/components/ui/pagination'

import { JobCard } from './JobCard'

import styles from './styles.module.sass'

/** Card-shaped placeholders while the first page loads */
const SKELETONS = 3

interface JobsListProps {
    /** The section's heading */
    title: string
    /** Its id, for `aria-labelledby` */
    id: string
    /** Without `limit`/`offset`: the list sets them (`perPage`, the current page) */
    query: Omit<ApiType.Telescope.ReqList, 'limit' | 'offset'>
    /** Jobs per page; a dashboard widget shows only the first page, without the pager */
    perPage: number
    /** Pages (the full list); omitted — the first page only (a dashboard widget) */
    page?: number
    onChangePage?: (page: number) => void
    /** Number the cards: the queue, where the order is the point */
    numbered?: boolean
    /** The count of all such jobs beside the heading */
    showCount?: boolean
    /** On the heading's line, on the right: the link to all jobs, or a filter */
    action?: React.ReactNode
    empty: string
    className?: string
}

/**
 * A section of telescope jobs — every job on /observatory/jobs, the next ones on the
 * /observatory dashboard: the heading (with the count, and a link or a filter on the right), one
 * `JobCard` per job, the pager under them.
 */
export const JobsList: React.FC<JobsListProps> = ({
    title,
    id,
    query,
    perPage,
    page,
    onChangePage,
    numbered,
    showCount,
    action,
    empty,
    className
}) => {
    const { t } = useTranslation()

    const offset = ((page ?? 1) - 1) * perPage
    const { data, isFetching, isLoading } = API.useTelescopeGetJobsQuery({ ...query, limit: perPage, offset })
    const List = numbered ? 'ol' : 'ul'

    return (
        <section
            className={cn(styles.jobsSection, className)}
            aria-labelledby={id}
        >
            <div className={styles.sectionHeader}>
                <h2
                    id={id}
                    className={styles.sectionTitle}
                >
                    {title}
                    {showCount && !!data?.count && <span className={styles.count}>{data.count}</span>}
                </h2>
                {action && <div className={styles.sectionAction}>{action}</div>}
            </div>

            {isLoading ? (
                <ul
                    className={styles.cards}
                    aria-hidden={true}
                >
                    {Array.from({ length: Math.min(SKELETONS, perPage) }, (_, index) => (
                        <li key={index}>
                            <Skeleton className={styles.cardSkeleton} />
                        </li>
                    ))}
                </ul>
            ) : data?.items.length ? (
                <List
                    className={cn(styles.cards, isFetching && styles.listFetching)}
                    start={numbered ? offset + 1 : undefined}
                >
                    {data.items.map((job, index) => (
                        <li key={job.id}>
                            <JobCard
                                job={job}
                                position={numbered ? offset + index + 1 : undefined}
                            />
                        </li>
                    ))}
                </List>
            ) : (
                <p className={styles.emptyState}>{empty}</p>
            )}

            {page !== undefined && (
                <Pagination
                    currentPage={page}
                    totalItemsCount={data?.count ?? 0}
                    perPage={perPage}
                    hideIfOnePage={true}
                    onChangePage={onChangePage}
                    captionPage={t('components.pages.observatory.telescope-jobs.page', 'Страница')}
                    captionNextPage={t('components.pages.observatory.telescope-jobs.page-next', 'Следующая')}
                    captionPrevPage={t('components.pages.observatory.telescope-jobs.page-prev', 'Предыдущая')}
                />
            )}
        </section>
    )
}
